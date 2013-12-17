package org.elasticsearch.marvel.monitor.exporter;
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
import org.elasticsearch.action.admin.indices.stats.CommonStats;
import org.elasticsearch.action.admin.indices.stats.IndexStats;
import org.elasticsearch.action.admin.indices.stats.IndicesStatsResponse;
import org.elasticsearch.action.admin.indices.stats.ShardStats;
import org.elasticsearch.cluster.routing.ShardRouting;
import org.elasticsearch.common.collect.ImmutableMap;
import org.elasticsearch.common.component.AbstractLifecycleComponent;
import org.elasticsearch.common.joda.Joda;
import org.elasticsearch.common.joda.time.format.DateTimeFormat;
import org.elasticsearch.common.joda.time.format.DateTimeFormatter;
import org.elasticsearch.common.settings.Settings;
import org.elasticsearch.common.unit.TimeValue;
import org.elasticsearch.common.xcontent.ToXContent;
import org.elasticsearch.common.xcontent.XContentBuilder;
import org.elasticsearch.common.xcontent.XContentFactory;
import org.elasticsearch.common.xcontent.XContentType;
import org.elasticsearch.common.xcontent.smile.SmileXContent;
import org.elasticsearch.discovery.Discovery;
import org.elasticsearch.marvel.monitor.Utils;
import org.elasticsearch.marvel.monitor.event.Event;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;

public class ESExporter extends AbstractLifecycleComponent<ESExporter> implements StatsExporter<ESExporter> {

    final String[] hosts;
    final String indexPrefix;
    final DateTimeFormatter indexTimeFormatter;
    final int timeout;

    final Discovery discovery;

    public final static DateTimeFormatter defaultDatePrinter = Joda.forPattern("date_time").printer();

    boolean checkedForIndexTemplate = false;

    final NodeStatsRenderer nodeStatsRenderer;
    final ShardStatsRenderer shardStatsRenderer;
    final IndexStatsRenderer indexStatsRenderer;
    final IndicesStatsRenderer indicesStatsRenderer;
    final EventsRenderer eventsRenderer;

    public ESExporter(Settings settings, Discovery discovery) {
        super(settings);

        this.discovery = discovery;

        hosts = settings.getAsArray("es.hosts", new String[]{"localhost:9200"});
        indexPrefix = settings.get("es.index.prefix", ".marvel");
        String indexTimeFormat = settings.get("es.index.timeformat", "YYYY.MM.dd");
        indexTimeFormatter = DateTimeFormat.forPattern(indexTimeFormat).withZoneUTC();

        timeout = (int) settings.getAsTime("es.timeout", new TimeValue(6000)).seconds();

        nodeStatsRenderer = new NodeStatsRenderer();
        shardStatsRenderer = new ShardStatsRenderer();
        indexStatsRenderer = new IndexStatsRenderer();
        indicesStatsRenderer = new IndicesStatsRenderer();
        eventsRenderer = new EventsRenderer();

        logger.debug("Initialized with targets: {}, index prefix [{}], index time format [{}]", hosts, indexPrefix, indexTimeFormat);
    }

    @Override
    public String name() {
        return "es_exporter";
    }


    @Override
    public void exportNodeStats(NodeStats nodeStats) {
        nodeStatsRenderer.reset(nodeStats);
        exportXContent(nodeStatsRenderer);
    }

    @Override
    public void exportShardStats(ShardStats[] shardStatsArray) {
        shardStatsRenderer.reset(shardStatsArray);
        exportXContent(shardStatsRenderer);
    }

    @Override
    public void exportIndicesStats(IndicesStatsResponse indicesStats) {
        Map<String, IndexStats> perIndexStats = indicesStats.getIndices();
        indexStatsRenderer.reset(perIndexStats.values().toArray(new IndexStats[perIndexStats.size()]));
        indicesStatsRenderer.reset(indicesStats.getTotal(), indicesStats.getPrimaries());
        logger.debug("exporting index_stats + indices_stats");
        HttpURLConnection conn = openExportingConnection();
        if (conn == null) {
            return;
        }
        try {
            addXContentRendererToConnection(conn, indexStatsRenderer);
            addXContentRendererToConnection(conn, indicesStatsRenderer);
            sendCloseExportingConnection(conn);
        } catch (IOException e) {
            logger.error("error sending data", e);
            return;
        }
    }

    @Override
    public void exportEvents(Event[] events) {
        eventsRenderer.reset(events);
        exportXContent(eventsRenderer);
    }


    private HttpURLConnection openExportingConnection() {
        if (!checkedForIndexTemplate) {
            if (!checkForIndexTemplate()) {
                logger.debug("no template defined yet. skipping");
                return null;
            }
        }

        logger.trace("setting up an export connection");
        HttpURLConnection conn = openConnection("POST", "/_bulk", XContentType.SMILE.restContentType());
        if (conn == null) {
            logger.error("could not connect to any configured elasticsearch instances: [{}]", hosts);
        }
        return conn;
    }

    private void addXContentRendererToConnection(HttpURLConnection conn,
                                                 MultiXContentRenderer renderer) throws IOException {
        OutputStream os = conn.getOutputStream();
        // TODO: find a way to disable builder's substream flushing or something neat solution
        for (int i = 0; i < renderer.length(); i++) {
            XContentBuilder builder = XContentFactory.smileBuilder(os);
            builder.startObject().startObject("index")
                    .field("_index", getIndexName())
                    .field("_type", renderer.type(i))
                    .endObject().endObject();
            builder.flush();
            os.write(SmileXContent.smileXContent.streamSeparator());

            builder = XContentFactory.smileBuilder(os);
            builder.humanReadable(false);
            renderer.render(i, builder);
            builder.flush();
            os.write(SmileXContent.smileXContent.streamSeparator());
        }
    }

    private void sendCloseExportingConnection(HttpURLConnection conn) throws IOException {
        logger.trace("sending content");
        OutputStream os = conn.getOutputStream();
        os.close();

        if (conn.getResponseCode() != 200) {
            logConnectionError("remote target didn't respond with 200 OK", conn);
        } else {
            conn.getInputStream().close(); // close and release to connection pool.
        }
    }

    private void exportXContent(MultiXContentRenderer xContentRenderer) {
        if (xContentRenderer.length() == 0) {
            return;
        }

        HttpURLConnection conn = openExportingConnection();
        if (conn == null) {
            return;
        }
        try {
            addXContentRendererToConnection(conn, xContentRenderer);
            sendCloseExportingConnection(conn);
        } catch (IOException e) {
            logger.error("error sending data", e);
            return;
        }

    }

    @Override
    protected void doStart() throws ElasticSearchException {
    }


    @Override
    protected void doStop() throws ElasticSearchException {
    }

    @Override
    protected void doClose() throws ElasticSearchException {
    }


    private String getIndexName() {
        return indexPrefix + "-" + indexTimeFormatter.print(System.currentTimeMillis());

    }


    private HttpURLConnection openConnection(String method, String uri) {
        return openConnection(method, uri, null);
    }

    private HttpURLConnection openConnection(String method, String uri, String contentType) {
        for (String host : hosts) {
            try {
                URL templateUrl = new URL("http://" + host + uri);
                HttpURLConnection conn = (HttpURLConnection) templateUrl.openConnection();
                conn.setRequestMethod(method);
                conn.setConnectTimeout(timeout);
                if (contentType != null) {
                    conn.setRequestProperty("Content-Type", XContentType.SMILE.restContentType());
                }
                conn.setUseCaches(false);
                if (method.equalsIgnoreCase("POST") || method.equalsIgnoreCase("PUT")) {
                    conn.setDoOutput(true);
                }
                conn.connect();

                return conn;
            } catch (IOException e) {
                logger.error("error connecting to [{}]", e, host);
            }
        }

        return null;
    }

    private boolean checkForIndexTemplate() {
        try {
            String templateName = "marvel";

            logger.debug("checking of target has template [{}]", templateName);
            // DO HEAD REQUEST, when elasticsearch supports it
            HttpURLConnection conn = openConnection("GET", "/_template/" + templateName);
            if (conn == null) {
                logger.error("Could not connect to any configured elasticsearch instances: [{}]", hosts);
                return false;
            }

            boolean hasTemplate = conn.getResponseCode() == 200;

            // nothing there, lets create it
            if (!hasTemplate) {
                logger.debug("no template found in elasticsearch for [{}]. Adding...", templateName);
                conn = openConnection("PUT", "/_template/" + templateName, XContentType.SMILE.restContentType());
                OutputStream os = conn.getOutputStream();
                XContentBuilder builder = XContentFactory.smileBuilder(os);
                builder.startObject();
                builder.field("template", ".marvel*");
                builder.startObject("mappings").startObject("_default_");
                builder.startArray("dynamic_templates").startObject().startObject("string_fields")
                        .field("match", "*")
                        .field("match_mapping_type", "string")
                        .startObject("mapping").field("index", "not_analyzed").endObject()
                        .endObject().endObject().endArray();
                builder.endObject().endObject(); // mapping + root object.
                builder.close();
                os.close();

                if (conn.getResponseCode() != 200) {
                    logConnectionError("error adding index template to elasticsearch", conn);
                }
                conn.getInputStream().close(); // close and release to connection pool.

            }
            checkedForIndexTemplate = true;
        } catch (IOException e) {
            logger.error("error when checking/adding template to elasticsearch", e);
            return false;
        }
        return true;
    }

    private void logConnectionError(String msg, HttpURLConnection conn) {
        InputStream inputStream = conn.getErrorStream();
        java.util.Scanner s = new java.util.Scanner(inputStream, "UTF-8").useDelimiter("\\A");
        String err = s.hasNext() ? s.next() : "";
        try {
            logger.error("{} response code [{} {}]. content: {}", msg, conn.getResponseCode(), conn.getResponseMessage(), err);
        } catch (IOException e) {
            logger.error("connection had an error while reporting the error. tough life.");
        }
    }

    interface MultiXContentRenderer {

        int length();

        String type(int i);

        void render(int index, XContentBuilder builder) throws IOException;
    }


    private void addNodeInfo(XContentBuilder builder) throws IOException {
        addNodeInfo(builder, "node");
    }

    private void addNodeInfo(XContentBuilder builder, String fieldname) throws IOException {
        builder.startObject(fieldname);
        Utils.nodeToXContent(discovery.localNode(), builder);
        builder.endObject();
    }


    class NodeStatsRenderer implements MultiXContentRenderer {

        NodeStats stats;
        ToXContent.MapParams xContentParams = new ToXContent.MapParams(
                ImmutableMap.of("node_info_format", "none", "load_average_format", "hash"));

        public void reset(NodeStats stats) {
            this.stats = stats;
        }

        @Override
        public int length() {
            return 1;
        }

        @Override
        public String type(int i) {
            return "node_stats";
        }

        @Override
        public void render(int index, XContentBuilder builder) throws IOException {
            builder.startObject();
            builder.field("@timestamp", defaultDatePrinter.print(stats.getTimestamp()));
            addNodeInfo(builder);
            stats.toXContent(builder, xContentParams);
            builder.endObject();
        }
    }

    class ShardStatsRenderer implements MultiXContentRenderer {

        ShardStats[] stats;
        long collectionTime;
        ToXContent.Params xContentParams = ToXContent.EMPTY_PARAMS;

        public void reset(ShardStats[] stats) {
            this.stats = stats;
            collectionTime = System.currentTimeMillis();
        }

        @Override
        public int length() {
            return stats == null ? 0 : stats.length;
        }

        @Override
        public String type(int i) {
            return "shard_stats";
        }

        @Override
        public void render(int index, XContentBuilder builder) throws IOException {
            builder.startObject();
            builder.field("@timestamp", defaultDatePrinter.print(collectionTime));
            ShardRouting shardRouting = stats[index].getShardRouting();
            builder.field("index", shardRouting.index());
            builder.field("shard_id", shardRouting.id());
            builder.field("shard_state", shardRouting.state());
            builder.field("primary", shardRouting.primary());
            addNodeInfo(builder);
            stats[index].getStats().toXContent(builder, xContentParams);
            builder.endObject();
        }
    }

    class IndexStatsRenderer implements MultiXContentRenderer {

        IndexStats[] stats;
        long collectionTime;
        ToXContent.Params xContentParams = ToXContent.EMPTY_PARAMS;

        public void reset(IndexStats[] stats) {
            this.stats = stats;
            collectionTime = System.currentTimeMillis();
        }

        @Override
        public int length() {
            return stats == null ? 0 : stats.length;
        }

        @Override
        public String type(int i) {
            return "index_stats";
        }

        @Override
        public void render(int index, XContentBuilder builder) throws IOException {
            builder.startObject();
            builder.field("@timestamp", defaultDatePrinter.print(collectionTime));
            IndexStats indexStats = stats[index];
            builder.field("index", indexStats.getIndex());
            addNodeInfo(builder, "_source_node");
            builder.startObject("primaries");
            indexStats.getPrimaries().toXContent(builder, xContentParams);
            builder.endObject();
            builder.startObject("total");
            indexStats.getTotal().toXContent(builder, xContentParams);
            builder.endObject();
            builder.endObject();
        }
    }

    class IndicesStatsRenderer implements MultiXContentRenderer {

        CommonStats totalStats;
        CommonStats primariesStats;
        long collectionTime;
        ToXContent.Params xContentParams = ToXContent.EMPTY_PARAMS;

        public void reset(CommonStats totalStats, CommonStats primariesStats) {
            this.totalStats = totalStats;
            this.primariesStats = primariesStats;
            collectionTime = System.currentTimeMillis();
        }

        @Override
        public int length() {
            return totalStats == null ? 0 : 1;
        }

        @Override
        public String type(int i) {
            return "indices_stats";
        }

        @Override
        public void render(int index, XContentBuilder builder) throws IOException {
            assert index == 0;
            builder.startObject();
            builder.field("@timestamp", defaultDatePrinter.print(collectionTime));
            addNodeInfo(builder, "_source_node");
            builder.startObject("primaries");
            primariesStats.toXContent(builder, xContentParams);
            builder.endObject();
            builder.startObject("total");
            totalStats.toXContent(builder, xContentParams);
            builder.endObject();
            builder.endObject();
        }
    }


    class EventsRenderer implements MultiXContentRenderer {

        Event[] events;
        ToXContent.Params xContentParams = ToXContent.EMPTY_PARAMS;

        public void reset(Event[] events) {
            this.events = events;
        }

        @Override
        public int length() {
            return events == null ? 0 : events.length;
        }

        @Override
        public String type(int i) {
            return events[i].type();
        }


        @Override
        public void render(int index, XContentBuilder builder) throws IOException {
            builder.startObject();
            addNodeInfo(builder, "_source_node");
            events[index].addXContentBody(builder, xContentParams);
            builder.endObject();
        }
    }

}

