package org.elasticsearch.marvel.monitor;
/*
 * Licensed to ElasticSearch under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership. ElasticSearch licenses this
 * file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */


import org.elasticsearch.ElasticSearchException;
import org.elasticsearch.action.admin.cluster.node.stats.NodeStats;
import org.elasticsearch.action.admin.indices.stats.CommonStatsFlags;
import org.elasticsearch.action.admin.indices.stats.IndicesStatsResponse;
import org.elasticsearch.action.admin.indices.stats.ShardStats;
import org.elasticsearch.action.support.IgnoreIndices;
import org.elasticsearch.client.Client;
import org.elasticsearch.cluster.ClusterChangedEvent;
import org.elasticsearch.cluster.ClusterService;
import org.elasticsearch.cluster.block.ClusterBlock;
import org.elasticsearch.cluster.node.DiscoveryNode;
import org.elasticsearch.cluster.routing.*;
import org.elasticsearch.common.Nullable;
import org.elasticsearch.common.Strings;
import org.elasticsearch.common.collect.ImmutableSet;
import org.elasticsearch.common.component.AbstractLifecycleComponent;
import org.elasticsearch.common.inject.Inject;
import org.elasticsearch.common.settings.Settings;
import org.elasticsearch.common.unit.TimeValue;
import org.elasticsearch.common.util.concurrent.ConcurrentCollections;
import org.elasticsearch.common.util.concurrent.EsExecutors;
import org.elasticsearch.discovery.Discovery;
import org.elasticsearch.index.service.IndexService;
import org.elasticsearch.index.shard.IndexShardState;
import org.elasticsearch.index.shard.service.IndexShard;
import org.elasticsearch.indices.IndicesLifecycle;
import org.elasticsearch.indices.IndicesService;
import org.elasticsearch.indices.InternalIndicesService;
import org.elasticsearch.marvel.monitor.event.*;
import org.elasticsearch.marvel.monitor.exporter.ESExporter;
import org.elasticsearch.marvel.monitor.exporter.StatsExporter;
import org.elasticsearch.node.service.NodeService;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.BlockingQueue;

import static org.elasticsearch.common.collect.Lists.newArrayList;

public class ExportersService extends AbstractLifecycleComponent<ExportersService> {

    private final InternalIndicesService indicesService;
    private final NodeService nodeService;
    private final ClusterService clusterService;
    private final Client client;

    private final IndicesLifecycle.Listener indicesLifeCycleListener;
    private final ClusterStateListener clusterStateEventListener;

    private volatile ExportingWorker exp;
    private volatile Thread thread;
    private final TimeValue interval;

    private Collection<StatsExporter> exporters;

    private String[] indicesToExport = Strings.EMPTY_ARRAY;

    private final BlockingQueue<Event> pendingEventsQueue;

    @Inject
    public ExportersService(Settings settings, IndicesService indicesService,
                            NodeService nodeService, ClusterService clusterService,
                            Client client,
                            Discovery discovery) {
        super(settings);
        this.indicesService = (InternalIndicesService) indicesService;
        this.clusterService = clusterService;
        this.nodeService = nodeService;
        this.interval = componentSettings.getAsTime("interval", TimeValue.timeValueSeconds(5));
        this.indicesToExport = componentSettings.getAsArray("indices", this.indicesToExport, true);
        this.client = client;

        indicesLifeCycleListener = new IndicesLifeCycleListener();
        clusterStateEventListener = new ClusterStateListener();
        pendingEventsQueue = ConcurrentCollections.newBlockingQueue();

        if (componentSettings.getAsBoolean("enabled", true)) {
            StatsExporter esExporter = new ESExporter(settings.getComponentSettings(ESExporter.class), discovery);
            this.exporters = ImmutableSet.of(esExporter);
        } else {
            this.exporters = ImmutableSet.of();
            logger.info("monitoring disabled by settings");
        }
    }

    @Override
    protected void doStart() throws ElasticSearchException {
        if (exporters.size() == 0) {
            return;
        }
        for (StatsExporter e : exporters)
            e.start();

        this.exp = new ExportingWorker();
        this.thread = new Thread(exp, EsExecutors.threadName(settings, "monitor"));
        this.thread.setDaemon(true);
        this.thread.start();

        indicesService.indicesLifecycle().addListener(indicesLifeCycleListener);
        clusterService.addLast(clusterStateEventListener);
    }

    @Override
    protected void doStop() throws ElasticSearchException {
        if (exporters.size() == 0) {
            return;
        }
        this.exp.closed = true;
        this.thread.interrupt();
        try {
            this.thread.join(60000);
        } catch (InterruptedException e) {
            // we don't care...
        }
        for (StatsExporter e : exporters)
            e.stop();

        indicesService.indicesLifecycle().removeListener(indicesLifeCycleListener);
        clusterService.remove(clusterStateEventListener);

    }

    @Override
    protected void doClose() throws ElasticSearchException {
        for (StatsExporter e : exporters)
            e.close();
    }

    class ExportingWorker implements Runnable {

        volatile boolean closed;

        @Override
        public void run() {
            while (!closed) {
                // sleep first to allow node to complete initialization before collecting the first start
                try {
                    Thread.sleep(interval.millis());
                } catch (InterruptedException e) {
                    // ignore, if closed, good....
                }

                // do the actual export..., go over the actual exporters list and...
                try {
                    exportNodeStats();

                    exportShardStats();

                    exportEvents();

                    if (clusterService.state().nodes().localNodeMaster()) {
                        exportIndicesStats();
                    }
                } catch (Throwable t) {
                    logger.error("Background thread had an uncaught exception:", t);
                }

            }

            logger.debug("shutting down worker, exporting pending event");
            exportEvents();

            logger.debug("worker shutdown");
        }

        private void exportIndicesStats() {
            logger.debug("local node is master, exporting aggregated stats");
            IndicesStatsResponse indicesStatsResponse = client.admin().indices().prepareStats().all().get();
            for (StatsExporter e : exporters) {
                try {
                    e.exportIndicesStats(indicesStatsResponse);
                } catch (Throwable t) {
                    logger.error("StatsExporter [{}] has thrown an exception:", t, e.name());
                }
            }
        }

        private void exportEvents() {
            logger.debug("Exporting events");
            ArrayList<Event> eventList = new ArrayList<Event>(pendingEventsQueue.size());
            pendingEventsQueue.drainTo(eventList);
            Event[] events = new Event[eventList.size()];
            eventList.toArray(events);

            for (StatsExporter e : exporters) {
                try {
                    e.exportEvents(events);
                } catch (Throwable t) {
                    logger.error("StatsExporter [{}] has thrown an exception:", t, e.name());
                }
            }
        }

        private void exportShardStats() {
            logger.debug("Collecting shard stats");
            String[] indices = clusterService.state().metaData().concreteIndices(indicesToExport, IgnoreIndices.DEFAULT, true);

            List<ShardStats> shardStats = newArrayList();
            for (String index : indices) {
                IndexService indexService = indicesService.indexService(index);
                if (indexService == null) {
                    continue; // something changed, move along
                }
                for (int shardId : indexService.shardIds()) {
                    IndexShard indexShard = indexService.shard(shardId);
                    if (indexShard == null) {
                        continue;
                    }
                    shardStats.add(new ShardStats(indexShard, CommonStatsFlags.ALL));
                }
            }
            ShardStats[] shardStatsArray = shardStats.toArray(new ShardStats[shardStats.size()]);

            logger.debug("Exporting shards stats");
            for (StatsExporter e : exporters) {
                try {
                    e.exportShardStats(shardStatsArray);
                } catch (Throwable t) {
                    logger.error("StatsExporter [{}] has thrown an exception:", t, e.name());
                }
            }
        }

        private void exportNodeStats() {
            logger.debug("Collecting node stats");
            NodeStats nodeStats = nodeService.stats();

            logger.debug("Exporting node stats");
            for (StatsExporter e : exporters) {
                try {
                    e.exportNodeStats(nodeStats);
                } catch (Throwable t) {
                    logger.error("StatsExporter [{}] has thrown an exception:", t, e.name());
                }
            }
        }
    }

    class ClusterStateListener implements org.elasticsearch.cluster.ClusterStateListener {

        @Override
        public void clusterChanged(ClusterChangedEvent event) {
            if (!event.localNodeMaster()) {
                return;
            }
            // only collect if i'm master.
            long timestamp = System.currentTimeMillis();
            if (!event.previousState().nodes().localNodeMaster()) {
                pendingEventsQueue.add(new NodeEvent.ElectedAsMaster(timestamp, event.state().nodes().localNode(), event.source()));
            }

            for (DiscoveryNode node : event.nodesDelta().addedNodes()) {
                pendingEventsQueue.add(new NodeEvent.NodeJoinLeave(timestamp, node, true, event.source()));
            }

            for (DiscoveryNode node : event.nodesDelta().removedNodes()) {
                pendingEventsQueue.add(new NodeEvent.NodeJoinLeave(timestamp, node, false, event.source()));
            }


            if (event.routingTableChanged()) {
                // hunt for initializing shards
                RoutingNodes previousRoutingNodes = event.previousState().routingNodes();
                for (ShardRouting shardRouting : event.state().routingNodes().shardsWithState(ShardRoutingState.INITIALIZING)) {
                    RoutingNode oldRoutingNode = previousRoutingNodes.node(shardRouting.currentNodeId());
                    boolean changed = true;
                    if (oldRoutingNode != null) {
                        for (ShardRouting oldShardRouting : oldRoutingNode.shards()) {
                            if (oldShardRouting.equals(shardRouting)) {
                                changed = false;
                                break;
                            }
                        }
                    }
                    if (!changed) {
                        continue; // no event.
                    }

                    if (shardRouting.relocatingNodeId() != null) {
                        // if relocating node is not null, this shard is initializing due to a relocation
                        ShardRouting tmpShardRouting = new MutableShardRouting(
                                shardRouting.index(), shardRouting.id(), shardRouting.relocatingNodeId(),
                                shardRouting.currentNodeId(), shardRouting.primary(),
                                ShardRoutingState.RELOCATING, shardRouting.version());
                        DiscoveryNode relocatingTo = null;
                        if (tmpShardRouting.relocatingNodeId() != null) {
                            relocatingTo = event.state().nodes().get(tmpShardRouting.relocatingNodeId());
                        }
                        pendingEventsQueue.add(new RoutingEvent.ShardRelocating(timestamp, tmpShardRouting,
                                relocatingTo, event.state().nodes().get(tmpShardRouting.currentNodeId())
                        ));
                    } else {
                        pendingEventsQueue.add(new RoutingEvent.ShardInitializing(timestamp, shardRouting,
                                event.state().nodes().get(shardRouting.currentNodeId())
                        ));
                    }

                }
            }

            if (event.blocksChanged()) {
                // TODO: Add index blocks
                List<ClusterBlock> removed = newArrayList();
                List<ClusterBlock> added = newArrayList();
                ImmutableSet<ClusterBlock> currentBlocks = event.state().blocks().global();
                ImmutableSet<ClusterBlock> previousBlocks = event.previousState().blocks().global();

                for (ClusterBlock block : previousBlocks) {
                    if (!currentBlocks.contains(block)) {
                        removed.add(block);
                    }
                }
                for (ClusterBlock block : currentBlocks) {
                    if (!previousBlocks.contains(block)) {
                        added.add(block);
                    }
                }

                for (ClusterBlock block : added) {
                    pendingEventsQueue.add(new ClusterEvent.ClusterBlock(timestamp, block, true, event.source()));
                }

                for (ClusterBlock block : removed) {
                    pendingEventsQueue.add(new ClusterEvent.ClusterBlock(timestamp, block, false, event.source()));
                }
            }

            for (String index : event.indicesCreated()) {
                pendingEventsQueue.add(new IndexMetaDataEvent.IndexCreateDelete(timestamp, index, true, event.source()));
            }

            for (String index : event.indicesDeleted()) {
                pendingEventsQueue.add(new IndexMetaDataEvent.IndexCreateDelete(timestamp, index, false, event.source()));
            }

        }
    }


    class IndicesLifeCycleListener extends IndicesLifecycle.Listener {

        @Override
        public void indexShardStateChanged(IndexShard indexShard, @Nullable IndexShardState previousState, IndexShardState newState, @Nullable String reason) {

            DiscoveryNode relocatingNode = null;
            if (indexShard.routingEntry() != null) {
                if (indexShard.routingEntry().relocatingNodeId() != null) {
                    relocatingNode = clusterService.state().nodes().get(indexShard.routingEntry().relocatingNodeId());
                }
            }

            pendingEventsQueue.add(new ShardEvent(System.currentTimeMillis(), newState,
                    indexShard.shardId(), clusterService.localNode(), relocatingNode, indexShard.routingEntry(), reason));
        }
    }
}
