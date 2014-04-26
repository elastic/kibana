package org.elasticsearch.marvel.agent;
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


import org.elasticsearch.action.admin.cluster.health.ClusterHealthResponse;
import org.elasticsearch.action.admin.cluster.health.ClusterHealthStatus;
import org.elasticsearch.action.admin.cluster.health.ClusterIndexHealth;
import org.elasticsearch.action.admin.cluster.node.stats.NodeStats;
import org.elasticsearch.action.admin.cluster.stats.ClusterStatsResponse;
import org.elasticsearch.action.admin.indices.stats.CommonStatsFlags;
import org.elasticsearch.action.admin.indices.stats.IndicesStatsResponse;
import org.elasticsearch.action.admin.indices.stats.ShardStats;
import org.elasticsearch.client.Client;
import org.elasticsearch.cluster.ClusterChangedEvent;
import org.elasticsearch.cluster.ClusterName;
import org.elasticsearch.cluster.ClusterService;
import org.elasticsearch.cluster.ClusterState;
import org.elasticsearch.cluster.block.ClusterBlock;
import org.elasticsearch.cluster.node.DiscoveryNode;
import org.elasticsearch.cluster.routing.IndexRoutingTable;
import org.elasticsearch.cluster.routing.IndexShardRoutingTable;
import org.elasticsearch.cluster.routing.ShardRouting;
import org.elasticsearch.cluster.settings.ClusterDynamicSettings;
import org.elasticsearch.cluster.settings.DynamicSettings;
import org.elasticsearch.common.Nullable;
import org.elasticsearch.common.Strings;
import org.elasticsearch.common.collect.ImmutableSet;
import org.elasticsearch.common.component.AbstractLifecycleComponent;
import org.elasticsearch.common.inject.Inject;
import org.elasticsearch.common.settings.Settings;
import org.elasticsearch.common.unit.TimeValue;
import org.elasticsearch.common.util.concurrent.ConcurrentCollections;
import org.elasticsearch.common.util.concurrent.EsExecutors;
import org.elasticsearch.index.service.IndexService;
import org.elasticsearch.index.shard.IndexShardState;
import org.elasticsearch.index.shard.service.IndexShard;
import org.elasticsearch.indices.IndicesLifecycle;
import org.elasticsearch.indices.IndicesService;
import org.elasticsearch.indices.InternalIndicesService;
import org.elasticsearch.marvel.agent.event.*;
import org.elasticsearch.marvel.agent.exporter.Exporter;
import org.elasticsearch.node.service.NodeService;
import org.elasticsearch.node.settings.NodeSettingsService;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.concurrent.BlockingQueue;

import static org.elasticsearch.common.collect.Lists.newArrayList;

public class AgentService extends AbstractLifecycleComponent<AgentService> implements NodeSettingsService.Listener {

    public static final String SETTINGS_INTERVAL = "marvel.agent.interval";
    public static final String SETTINGS_INDICES = "marvel.agent.indices";
    public static final String SETTINGS_ENABLED = "marvel.agent.enabled";
    public static final String SETTINGS_SHARD_STATS_ENABLED = "marvel.agent.shard_stats.enabled";
    public static final String SETTINGS_CLUSTER_STATE_HEARTBEAT_INTERVAL = "marvel.agent.cluster_state.heartbeat";

    private final InternalIndicesService indicesService;
    private final NodeService nodeService;
    private final ClusterService clusterService;
    private final Client client;
    private final String clusterName;

    private final IndicesLifecycle.Listener indicesLifeCycleListener;
    private final ClusterStateListener clusterStateEventListener;

    private volatile ExportingWorker exportingWorker;

    private volatile Thread workerThread;
    private volatile long samplingInterval;
    private volatile long clusterStateHeartbeatInterval;
    volatile private String[] indicesToExport = Strings.EMPTY_ARRAY;
    volatile private boolean exportShardStats;

    private Collection<Exporter> exporters;


    private final BlockingQueue<Event> pendingEventsQueue;

    @Inject
    public AgentService(Settings settings, IndicesService indicesService,
                        NodeService nodeService, ClusterService clusterService,
                        Client client, ClusterName clusterName,
                        NodeSettingsService nodeSettingsService,
                        @ClusterDynamicSettings DynamicSettings dynamicSettings,
                        Set<Exporter> exporters) {
        super(settings);
        this.indicesService = (InternalIndicesService) indicesService;
        this.clusterService = clusterService;
        this.nodeService = nodeService;
        this.samplingInterval = settings.getAsTime(SETTINGS_INTERVAL, TimeValue.timeValueSeconds(10)).millis();
        this.clusterStateHeartbeatInterval = settings.getAsTime(SETTINGS_CLUSTER_STATE_HEARTBEAT_INTERVAL, TimeValue.timeValueMinutes(60)).millis();
        this.indicesToExport = settings.getAsArray(SETTINGS_INDICES, this.indicesToExport, true);
        this.exportShardStats = settings.getAsBoolean(SETTINGS_SHARD_STATS_ENABLED, false);
        this.client = client;
        this.clusterName = clusterName.value();

        indicesLifeCycleListener = new IndicesLifeCycleListener();
        clusterStateEventListener = new ClusterStateListener();
        pendingEventsQueue = ConcurrentCollections.newBlockingQueue();

        if (settings.getAsBoolean(SETTINGS_ENABLED, true)) {
            this.exporters = ImmutableSet.copyOf(exporters);
        } else {
            this.exporters = ImmutableSet.of();
            logger.info("collecting disabled by settings");
        }

        nodeSettingsService.addListener(this);
        dynamicSettings.addDynamicSetting(SETTINGS_INTERVAL);
        dynamicSettings.addDynamicSetting(SETTINGS_INDICES + ".*"); // array settings
        dynamicSettings.addDynamicSetting(SETTINGS_SHARD_STATS_ENABLED);
    }

    protected void applyIntervalSettings() {
        if (samplingInterval <= 0) {
            logger.info("data sampling is disabled due to interval settings [{}]", samplingInterval);
            if (workerThread != null) {

                // notify  worker to stop on its leisure, not to disturb an exporting operation
                exportingWorker.closed = true;

                exportingWorker = null;
                workerThread = null;
            }
        } else if (workerThread == null || !workerThread.isAlive()) {

            exportingWorker = new ExportingWorker();
            workerThread = new Thread(exportingWorker, EsExecutors.threadName(settings, "marvel.exporters"));
            workerThread.setDaemon(true);
            workerThread.start();

        }
    }

    @Override
    protected void doStart() {
        if (exporters.size() == 0) {
            return;
        }
        for (Exporter e : exporters)
            e.start();

        indicesService.indicesLifecycle().addListener(indicesLifeCycleListener);
        clusterService.addLast(clusterStateEventListener);

        applyIntervalSettings();
    }

    @Override
    protected void doStop() {
        if (exporters.size() == 0) {
            return;
        }
        if (workerThread != null && workerThread.isAlive()) {
            exportingWorker.closed = true;
            workerThread.interrupt();
            try {
                workerThread.join(60000);
            } catch (InterruptedException e) {
                // we don't care...
            }

        }
        for (Exporter e : exporters)
            e.stop();

        indicesService.indicesLifecycle().removeListener(indicesLifeCycleListener);
        clusterService.remove(clusterStateEventListener);
    }

    @Override
    protected void doClose() {
        for (Exporter e : exporters)
            e.close();
    }

    @Override
    public void onRefreshSettings(Settings settings) {
        TimeValue newSamplingInterval = settings.getAsTime(SETTINGS_INTERVAL, null);
        if (newSamplingInterval != null) {
            logger.info("sampling interval updated to [{}]", newSamplingInterval);
            samplingInterval = newSamplingInterval.millis();
            applyIntervalSettings();
        }

        String[] indices = settings.getAsArray(SETTINGS_INDICES, null, true);
        if (indices != null) {
            logger.info("sampling indices updated to [{}]", Strings.arrayToCommaDelimitedString(indices));
            indicesToExport = indices;
        }

        Boolean shardsExport = settings.getAsBoolean(SETTINGS_SHARD_STATS_ENABLED, null);
        if (shardsExport != null) {
            logger.info("updating " + SETTINGS_SHARD_STATS_ENABLED + " to [" + shardsExport + "]");
            exportShardStats = shardsExport;
        }
    }

    class ExportingWorker implements Runnable {

        volatile boolean closed = false;

        @Override
        public void run() {
            long lastClusterStateHeartbeat = 0;
            while (!closed) {
                // sleep first to allow node to complete initialization before collecting the first start
                try {
                    Thread.sleep(samplingInterval);
                    if (closed) {
                        continue;
                    }

                    // do the actual export..., go over the actual exporters list and...
                    exportNodeStats();
                    if (exportShardStats) {
                        exportShardStats();
                    }
                    exportEvents();

                    ClusterState clusterState = clusterService.state();

                    if (clusterState.nodes().localNodeMaster()) {
                        exportIndicesStats();
                        exportClusterStats();
                        if (clusterStateHeartbeatInterval >= 0 && System.currentTimeMillis() > lastClusterStateHeartbeat + clusterStateHeartbeatInterval) {
                            logger.trace("exporting cluster state heartbeat");
                            ClusterHealthResponse health = new ClusterHealthResponse(clusterName,
                                    clusterState.metaData().concreteAllIndices(), clusterState);

                            pendingEventsQueue.add(new ClusterEvent.ClusterStateChange(System.currentTimeMillis(), clusterState,
                                    "periodic sample", health.getStatus(), clusterName, "heartbeat"));
                            lastClusterStateHeartbeat = System.currentTimeMillis();
                        }
                    }
                } catch (InterruptedException e) {
                    // ignore, if closed, good....

                } catch (Throwable t) {
                    logger.error("Background thread had an uncaught exception:", t);
                }

            }

            logger.debug("shutting down worker, exporting pending event");
            exportEvents();

            logger.debug("worker shutdown");
        }

        private void exportIndicesStats() {
            logger.trace("local node is master, exporting indices stats");
            IndicesStatsResponse indicesStatsResponse = client.admin().indices().prepareStats().all().setIndices(indicesToExport).get();
            for (Exporter e : exporters) {
                try {
                    e.exportIndicesStats(indicesStatsResponse);
                } catch (Throwable t) {
                    logger.error("Exporter [{}] has thrown an exception:", t, e.name());
                }
            }
        }

        private void exportClusterStats() {
            logger.trace("local node is master, exporting cluster stats");
            ClusterStatsResponse stats = client.admin().cluster().prepareClusterStats().get();
            for (Exporter e : exporters) {
                try {
                    e.exportClusterStats(stats);
                } catch (Throwable t) {
                    logger.error("exporter [{}] has thrown an exception:", t, e.name());
                }
            }
        }

        private void exportEvents() {
            logger.trace("exporting events");
            ArrayList<Event> eventList = new ArrayList<Event>(pendingEventsQueue.size());
            pendingEventsQueue.drainTo(eventList);
            Event[] events = new Event[eventList.size()];
            eventList.toArray(events);

            for (Exporter e : exporters) {
                try {
                    e.exportEvents(events);
                } catch (Throwable t) {
                    logger.error("exporter [{}] has thrown an exception:", t, e.name());
                }
            }
        }

        private void exportShardStats() {
            logger.trace("Collecting shard stats");
            String[] indices = clusterService.state().metaData().concreteIndices(indicesToExport);

            List<ShardStats> shardStats = newArrayList();
            for (String index : indices) {
                IndexService indexService = indicesService.indexService(index);
                if (indexService == null) {
                    continue; // something changed, move along
                }
                for (int shardId : indexService.shardIds()) {
                    IndexShard indexShard = indexService.shard(shardId);
                    if (indexShard == null || indexShard.state() != IndexShardState.STARTED) {
                        continue;
                    }
                    shardStats.add(new ShardStats(indexShard, CommonStatsFlags.ALL));
                }
            }
            ShardStats[] shardStatsArray = shardStats.toArray(new ShardStats[shardStats.size()]);

            logger.trace("Exporting shards stats");
            for (Exporter e : exporters) {
                try {
                    e.exportShardStats(shardStatsArray);
                } catch (Throwable t) {
                    logger.error("exporter [{}] has thrown an exception:", t, e.name());
                }
            }
        }

        private void exportNodeStats() {
            logger.trace("Collecting node stats");
            NodeStats nodeStats = nodeService.stats();

            logger.trace("Exporting node stats");
            for (Exporter e : exporters) {
                try {
                    e.exportNodeStats(nodeStats);
                } catch (Throwable t) {
                    logger.error("exporter [{}] has thrown an exception:", t, e.name());
                }
            }
        }
    }

    class ClusterStateListener implements org.elasticsearch.cluster.ClusterStateListener {

        @Override
        public void clusterChanged(ClusterChangedEvent event) {
            if (samplingInterval <= 0) {
                // ignore as we're not sampling
                return;
            }

            if (!event.localNodeMaster()) {
                return;
            }

            // will be set to non empty value if cluster state needs to be exported
            StringBuilder stateExportDescription = new StringBuilder();

            long timestamp = System.currentTimeMillis();

            if (event.nodesDelta().added()) {
                stateExportDescription.append(", nodes joined");
            }
            for (DiscoveryNode node : event.nodesDelta().addedNodes()) {
                pendingEventsQueue.add(new NodeEvent.NodeJoinLeave(timestamp, clusterName, node, true, event.source()));
            }

            if (event.nodesDelta().removed()) {
                stateExportDescription.append(", nodes left");
            }
            for (DiscoveryNode node : event.nodesDelta().removedNodes()) {
                pendingEventsQueue.add(new NodeEvent.NodeJoinLeave(timestamp, clusterName, node, false, event.source()));
            }


            if (!event.previousState().nodes().localNodeMaster()) {
                stateExportDescription.append(", master elected");
                pendingEventsQueue.add(new NodeEvent.ElectedAsMaster(timestamp, clusterName, event.state().nodes().localNode(),
                        event.source()));
            }

            if (event.blocksChanged()) {
                stateExportDescription.append(", blocks changed");

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
                    pendingEventsQueue.add(new ClusterEvent.ClusterBlock(timestamp, clusterName, block, true, event.source()));
                }

                for (ClusterBlock block : removed) {
                    pendingEventsQueue.add(new ClusterEvent.ClusterBlock(timestamp, clusterName, block, false, event.source()));
                }
            }

            if (!event.indicesCreated().isEmpty()) {
                stateExportDescription.append(", indices created");
                for (String index : event.indicesCreated()) {
                    pendingEventsQueue.add(new IndexEvent.IndexCreateDelete(timestamp, clusterName, index, true, event.source()));
                }
            }

            if (!event.indicesDeleted().isEmpty()) {
                stateExportDescription.append(", indices deleted");
                for (String index : event.indicesDeleted()) {
                    pendingEventsQueue.add(new IndexEvent.IndexCreateDelete(timestamp, clusterName, index, false, event.source()));
                }
            }


            if (event.routingTableChanged()) {
                stateExportDescription.append(", routing change");

                for (ShardRoutingDelta changedShard : getAssignedShardRoutingDelta(event.previousState(), event.state())) {
                    ShardRouting current = changedShard.current;
                    if (changedShard.previous == null) {
                        pendingEventsQueue.add(new RoutingEvent.ShardInitializing(timestamp, clusterName, current,
                                event.state().nodes().get(current.currentNodeId())
                        ));
                    } else if (current.state() != changedShard.previous.state()) {
                        // state change - remember these are only assigned shard
                        switch (current.state()) {
                            case STARTED:
                                pendingEventsQueue.add(new RoutingEvent.ShardStarted(timestamp, clusterName, current,
                                        event.state().nodes().get(current.currentNodeId())
                                ));
                                break;
                            case RELOCATING:
                                pendingEventsQueue.add(new RoutingEvent.ShardRelocating(timestamp, clusterName, changedShard.current,
                                                event.state().nodes().get(current.currentNodeId()),
                                                event.state().nodes().get(current.relocatingNodeId()))
                                );
                                break;
                            default:
                                // we shouldn't get here as INITIALIZING will not have a previous and UNASSIGNED will not be in the change list.
                                assert false : "changed shard has an unexpected state [" + current.state() + "]";
                        }
                    } else if (current.primary() && !changedShard.previous.primary()) {
                        pendingEventsQueue.add(new RoutingEvent.ShardPromotedToPrimary(timestamp, clusterName, current,
                                event.state().nodes().get(current.currentNodeId())
                        ));
                    }
                }
            }

            // check for index & cluster status changes
            ClusterHealthResponse prevHealth = new ClusterHealthResponse(clusterName, event.previousState().metaData().concreteAllIndices()
                    , event.previousState());
            ClusterHealthResponse curHealth = new ClusterHealthResponse(clusterName, event.state().metaData().concreteAllIndices(), event.state());

            ClusterHealthStatus clusterHealthStatus = curHealth.getStatus();

            if (prevHealth.getStatus() != curHealth.getStatus()) {
                pendingEventsQueue.add(new ClusterEvent.ClusterStatus(timestamp, clusterName, event.source(), curHealth));
            }

            for (ClusterIndexHealth indexHealth : curHealth) {
                ClusterIndexHealth prevIndexHealth = prevHealth.getIndices().get(indexHealth.getIndex());
                if (prevIndexHealth != null && prevIndexHealth.getStatus() == indexHealth.getStatus()) {
                    continue;
                }

                pendingEventsQueue.add(new IndexEvent.IndexStatus(timestamp, clusterName, event.source(), indexHealth));
            }

            if (stateExportDescription.length() != 0) {
                String s = stateExportDescription.substring(2); // remove initial ", "
                pendingEventsQueue.add(
                        new ClusterEvent.ClusterStateChange(
                                timestamp, event.state(), s, clusterHealthStatus,
                                clusterName, event.source())
                );
            }
        }

    }

    static class ShardRoutingDelta {
        @Nullable
        final public ShardRouting previous;

        final public ShardRouting current;

        public ShardRoutingDelta(@Nullable ShardRouting previous, ShardRouting current) {
            this.previous = previous;
            this.current = current;
        }
    }

    protected List<ShardRoutingDelta> getAssignedShardRoutingDelta(ClusterState previousState, ClusterState currentState) {
        List<ShardRoutingDelta> changedShards = new ArrayList<ShardRoutingDelta>();

        for (IndexRoutingTable indexRoutingTable : currentState.routingTable()) {
            IndexRoutingTable prevIndexRoutingTable = previousState.routingTable().getIndicesRouting().get(indexRoutingTable.index());
            if (prevIndexRoutingTable == null) {
                for (IndexShardRoutingTable shardRoutingTable : indexRoutingTable) {
                    for (ShardRouting shardRouting : shardRoutingTable.assignedShards()) {
                        changedShards.add(new ShardRoutingDelta(null, shardRouting));
                    }
                }
                continue;
            }
            for (IndexShardRoutingTable shardRoutingTable : indexRoutingTable) {
                IndexShardRoutingTable prevShardRoutingTable = prevIndexRoutingTable.shard(shardRoutingTable.shardId().id());
                if (prevShardRoutingTable == null) {
                    for (ShardRouting shardRouting : shardRoutingTable.assignedShards()) {
                        changedShards.add(new ShardRoutingDelta(null, shardRouting));
                    }
                    continue;
                }
                for (ShardRouting shardRouting : shardRoutingTable.getAssignedShards()) {

                    ShardRouting prevShardRouting = null;
                    for (ShardRouting candidate : prevShardRoutingTable.assignedShards()) {
                        if (candidate.currentNodeId().equals(shardRouting.currentNodeId())) {
                            prevShardRouting = candidate;
                            break;
                        } else if (shardRouting.currentNodeId().equals(candidate.relocatingNodeId())) {
                            // the shard relocated here
                            prevShardRouting = candidate;
                            break;
                        }
                    }
                    if (prevShardRouting != null && prevShardRouting.equals(shardRouting)) {
                        continue; // nothing changed.
                    }

                    changedShards.add(new ShardRoutingDelta(prevShardRouting, shardRouting));
                }
            }

        }

        return changedShards;
    }

    class IndicesLifeCycleListener extends IndicesLifecycle.Listener {

        @Override
        public void indexShardStateChanged(IndexShard indexShard, @Nullable IndexShardState previousState, IndexShardState currentState, @Nullable String reason) {
            if (samplingInterval <= 0) {
                // ignore as we're not sampling
                return;
            }
            DiscoveryNode relocatingNode = null;
            if (indexShard.routingEntry() != null) {
                if (indexShard.routingEntry().relocatingNodeId() != null) {
                    relocatingNode = clusterService.state().nodes().get(indexShard.routingEntry().relocatingNodeId());
                }
            }

            pendingEventsQueue.add(new ShardEvent(System.currentTimeMillis(), clusterName, currentState,
                    indexShard.shardId(), clusterService.localNode(), relocatingNode, indexShard.routingEntry(), reason));
        }
    }
}
