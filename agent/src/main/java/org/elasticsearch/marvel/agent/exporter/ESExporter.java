package org.elasticsearch.marvel.agent.exporter;
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


import org.elasticsearch.action.admin.cluster.node.stats.NodeStats;
import org.elasticsearch.action.admin.cluster.stats.ClusterStatsResponse;
import org.elasticsearch.action.admin.indices.stats.CommonStats;
import org.elasticsearch.action.admin.indices.stats.IndexStats;
import org.elasticsearch.action.admin.indices.stats.IndicesStatsResponse;
import org.elasticsearch.action.admin.indices.stats.ShardStats;
import org.elasticsearch.cluster.ClusterName;
import org.elasticsearch.cluster.routing.ShardRouting;
import org.elasticsearch.common.Base64;
import org.elasticsearch.common.collect.ImmutableMap;
import org.elasticsearch.common.component.AbstractLifecycleComponent;
import org.elasticsearch.common.io.Streams;
import org.elasticsearch.common.joda.Joda;
import org.elasticsearch.common.joda.time.format.DateTimeFormat;
import org.elasticsearch.common.joda.time.format.DateTimeFormatter;
import org.elasticsearch.common.settings.Settings;
import org.elasticsearch.common.unit.TimeValue;
import org.elasticsearch.common.util.concurrent.EsExecutors;
import org.elasticsearch.common.xcontent.*;
import org.elasticsearch.common.xcontent.json.JsonXContent;
import org.elasticsearch.common.xcontent.smile.SmileXContent;
import org.elasticsearch.discovery.Discovery;
import org.elasticsearch.env.Environment;
import org.elasticsearch.marvel.agent.Plugin;
import org.elasticsearch.marvel.agent.Utils;
import org.elasticsearch.marvel.agent.event.Event;

import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLEncoder;
import java.util.ArrayList;
import java.util.Map;

public class ESExporter extends AbstractLifecycleComponent<ESExporter> implements Exporter<ESExporter> {

    volatile String[] hosts;
    final String indexPrefix;
    final DateTimeFormatter indexTimeFormatter;
    final int timeout;

    // index to upload dashboards into.
    final String kibanaIndex;
    final String[] dashboardPathsToUpload;

    final Discovery discovery;
    final ClusterName clusterName;

    public final static DateTimeFormatter defaultDatePrinter = Joda.forPattern("date_time").printer();

    volatile boolean checkedAndUploadedAllResources = false;

    final NodeStatsRenderer nodeStatsRenderer;
    final ShardStatsRenderer shardStatsRenderer;
    final IndexStatsRenderer indexStatsRenderer;
    final IndicesStatsRenderer indicesStatsRenderer;
    final ClusterStatsRenderer clusterStatsRenderer;
    final EventsRenderer eventsRenderer;

    ConnectionKeepAliveWorker keepAliveWorker;
    Thread keepAliveThread;

    public ESExporter(Settings settings, Discovery discovery, ClusterName clusterName, Environment environment, Plugin marvelPlugin) {
        super(settings);

        this.discovery = discovery;
        this.clusterName = clusterName;

        hosts = settings.getAsArray("es.hosts", new String[]{"localhost:9200"});
        indexPrefix = settings.get("es.index.prefix", ".marvel");
        String indexTimeFormat = settings.get("es.index.timeformat", "YYYY.MM.dd");
        indexTimeFormatter = DateTimeFormat.forPattern(indexTimeFormat).withZoneUTC();

        timeout = (int) settings.getAsTime("es.timeout", new TimeValue(6000)).seconds();

        kibanaIndex = settings.get("es.kibana_index", ".marvel-kibana");


        String dashboardsBasePath = settings.get("es.upload.dashboards.path");
        File dashboardsBase;
        if (dashboardsBasePath != null) {
            dashboardsBase = new File(dashboardsBasePath);
        } else {
            dashboardsBase = new File(new File(environment.pluginsFile(), marvelPlugin.name()),
                    "_site/app/dashboards/marvel".replace('/', File.separatorChar)
            );
        }
        ArrayList<String> dashboardPaths = new ArrayList<String>();
        for (String d : settings.getAsArray("es.upload.dashboards", new String[]{})) {
            dashboardPaths.add(new File(dashboardsBase, d).getAbsolutePath());
        }

        dashboardPathsToUpload = dashboardPaths.toArray(new String[dashboardPaths.size()]);

        nodeStatsRenderer = new NodeStatsRenderer();
        shardStatsRenderer = new ShardStatsRenderer();
        indexStatsRenderer = new IndexStatsRenderer();
        indicesStatsRenderer = new IndicesStatsRenderer();
        clusterStatsRenderer = new ClusterStatsRenderer();
        eventsRenderer = new EventsRenderer();

        logger.debug("initialized with targets: {}, index prefix [{}], index time format [{}]", hosts, indexPrefix, indexTimeFormat);
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

    @Override
    public void exportClusterStats(ClusterStatsResponse clusterStats) {
        clusterStatsRenderer.reset(clusterStats);
        exportXContent(clusterStatsRenderer);
    }

    protected void initKeepAliveWorker() {
        keepAliveWorker = new ConnectionKeepAliveWorker();
        keepAliveThread = new Thread(keepAliveWorker, EsExecutors.threadName(settings, "keep_alive"));
        keepAliveThread.setDaemon(true);
        keepAliveThread.start();
    }

    private HttpURLConnection openExportingConnection() {
        if (keepAliveWorker == null) {
            // delayed initialization of keep alive worker, to allow ES to start up in
            // the case we send metrics to our own ES
            initKeepAliveWorker();
        }
        if (!checkedAndUploadedAllResources) {
            try {
                checkedAndUploadedAllResources = checkAndUploadAllResources();
            } catch (RuntimeException e) {
                logger.error("failed to upload critical resources, stopping export", e);
                return null;
            }
        }

        logger.trace("setting up an export connection");
        HttpURLConnection conn = openConnection("POST", "_bulk", XContentType.SMILE.restContentType());
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
            XContentBuilder builder = XContentFactory.smileBuilder();
            builder.startObject().startObject("index")
                    .field("_index", getIndexName())
                    .field("_type", renderer.type(i))
                    .endObject().endObject();
            os.write(builder.bytes().array(), builder.bytes().arrayOffset(), builder.bytes().length());
            os.write(SmileXContent.smileXContent.streamSeparator());

            builder = XContentFactory.smileBuilder();
            builder.humanReadable(false);
            renderer.render(i, builder);
            builder.close();
            os.write(builder.bytes().array(), builder.bytes().arrayOffset(), builder.bytes().length());
            os.write(SmileXContent.smileXContent.streamSeparator());
        }
    }

    private void sendCloseExportingConnection(HttpURLConnection conn) throws IOException {
        logger.trace("sending content");
        OutputStream os = conn.getOutputStream();
        os.close();

        InputStream inputStream = conn.getInputStream();
        while (inputStream.read() != -1) ;
        inputStream.close();

        if (conn.getResponseCode() != 200) {
            logConnectionError("remote target didn't respond with 200 OK", conn);
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
    protected void doStart() {
        // not initializing keep alive worker here but rather upon first exporting.
        // In the case we are sending metrics to the same ES as where the plugin is hosted
        // we want to give it some time to start.
    }


    @Override
    protected void doStop() {
        if (keepAliveWorker != null) {
            keepAliveWorker.closed = true;
            keepAliveThread.interrupt();
            try {
                keepAliveThread.join(6000);
            } catch (InterruptedException e) {
                // don't care.
            }
        }
    }

    @Override
    protected void doClose() {
    }


    private String getIndexName() {
        return indexPrefix + "-" + indexTimeFormatter.print(System.currentTimeMillis());

    }


    private HttpURLConnection openConnection(String method, String path) {
        return openConnection(method, path, null);
    }

    private HttpURLConnection openConnection(String method, String path, String contentType) {
        int hostIndex = 0;
        try {
            for (; hostIndex < hosts.length; hostIndex++) {
                String host = hosts[hostIndex];
                try {
                    URL url = new URL("http://" + host + "/" + path);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod(method);
                    conn.setConnectTimeout(timeout);
                    if (contentType != null) {
                        conn.setRequestProperty("Content-Type", XContentType.SMILE.restContentType());
                    }
                    if (url.getUserInfo() != null) {
                        String basicAuth = "Basic " + Base64.encodeBytes(url.getUserInfo().getBytes("ISO-8859-1"));
                        conn.setRequestProperty("Authorization", basicAuth);
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
        } finally {
            if (hostIndex > 0 && hostIndex < hosts.length) {
                logger.debug("moving [{}] failed hosts to the end of the list", hostIndex + 1);
                String[] newHosts = new String[hosts.length];
                System.arraycopy(hosts, hostIndex, newHosts, 0, hosts.length - hostIndex);
                System.arraycopy(hosts, 0, newHosts, hosts.length - hostIndex - 1, hostIndex + 1);
                hosts = newHosts;
                logger.debug("preferred target host is now [{}]", hosts[0]);
            }
        }

        return null;
    }

    /**
     * Checks if resources such as index templates and dashboards already exist and if not uploads them/
     * Any critical error that should prevent data exporting is communicated via an exception.
     *
     * @return true if all resources exist or are uploaded.
     */
    private boolean checkAndUploadAllResources() {
        boolean ret = checkAndUploadIndexTemplate();
        for (String dashPath : dashboardPathsToUpload) {
            ret = checkAndUploadDashboard(dashPath) && ret;
        }
        return ret;
    }

    private boolean checkAndUploadDashboard(String path) {
        logger.debug("checking/uploading [{}]", path);
        File dashboardFile = new File(path);
        if (!dashboardFile.exists()) {
            logger.warn("can't upload dashboard [{}] - file doesn't exist", path);
            return true;
        }
        try {
            byte[] dashboardBytes = Streams.copyToByteArray(dashboardFile);
            XContentParser parser = XContentHelper.createParser(dashboardBytes, 0, dashboardBytes.length);
            XContentParser.Token token = parser.nextToken();
            if (token == null) {
                throw new IOException("no data");
            }
            if (token != XContentParser.Token.START_OBJECT) {
                throw new IOException("should start with an object");
            }
            String dashboardTitle = null;
            String currentFieldName = null;
            while (dashboardTitle == null && (token = parser.nextToken()) != XContentParser.Token.END_OBJECT) {
                switch (token) {
                    case START_ARRAY:
                        parser.skipChildren();
                        break;
                    case START_OBJECT:
                        parser.skipChildren();
                        break;
                    case FIELD_NAME:
                        currentFieldName = parser.currentName();
                        break;
                    case VALUE_STRING:
                        if ("title".equals(currentFieldName)) {
                            dashboardTitle = parser.text();
                        }
                        break;
                }
            }
            if (dashboardTitle == null) {
                throw new IOException("failed to find dashboard title");
            }

            XContentBuilder builder = JsonXContent.contentBuilder();
            builder.startObject();
            builder.field("title", dashboardTitle);
            builder.field("dashboard", new String(dashboardBytes, "UTF-8"));
            builder.endObject();

            return checkAndUpload(kibanaIndex, "dashboard", dashboardTitle, builder.bytes().toBytes());
        } catch (IOException e) {
            logger.error("error while checking/uploading dashboard [{}]", path, e);
            return false;
        }
    }

    private String urlEncode(String s) {
        try {
            return URLEncoder.encode(s, "UTF-8");
        } catch (UnsupportedEncodingException e) {
            throw new RuntimeException("failed to url encode [" + s + "]", e);
        }
    }

    /**
     * checks whether a documents already exists in ES and if not uploads it
     *
     * @return true if the document exists or has been successfully uploaded.
     */
    private boolean checkAndUpload(String index, String type, String id, byte[] bytes) throws IOException {
        return checkAndUpload(urlEncode(index) + "/" + urlEncode(type) + "/" + urlEncode(id), bytes);
    }

    /**
     * checks whether a documents already exists in ES and if not uploads it
     *
     * @return true if the document exists or has been successfully uploaded.
     */
    private boolean checkAndUpload(String path, byte[] bytes) throws IOException {

        logger.debug("checking if target has [{}]", path);

        HttpURLConnection conn = openConnection("HEAD", path);
        if (conn == null) {
            logger.error("could not connect to any configured elasticsearch instances: [{}]", hosts);
            return false;
        }

        boolean hasDoc;
        hasDoc = conn.getResponseCode() == 200;

        // nothing there, lets create it
        if (!hasDoc) {
            logger.debug("no document found in elasticsearch for [{}]. Adding...", path);
            conn = openConnection("PUT", path, XContentType.JSON.restContentType());
            OutputStream os = conn.getOutputStream();
            Streams.copy(bytes, os);
            if (!(conn.getResponseCode() == 200 || conn.getResponseCode() == 201)) {
                logConnectionError("error adding document to elasticsearch", conn);
            } else {
                hasDoc = true;
            }
            conn.getInputStream().close(); // close and release to connection pool.
        }

        return hasDoc;
    }

    private boolean checkAndUploadIndexTemplate() {
        byte[] template;
        try {
            template = Streams.copyToBytesFromClasspath("/marvel_index_template.json");
        } catch (IOException e) {
            // throwing an exception to stop exporting process - we don't want to send data unless
            // we put in the template for it.
            throw new RuntimeException("failed to load marvel_index_template.json", e);
        }
        try {
            return checkAndUpload("_template/marvel", template);
        } catch (IOException e) {
            // if we're not sure of the template, we can't send data... re-raise exception.
            throw new RuntimeException("failed to load/verify index template", e);
        }
    }

    private void logConnectionError(String msg, HttpURLConnection conn) {
        InputStream inputStream = conn.getErrorStream();
        String err = "";
        if (inputStream != null) {
            java.util.Scanner s = new java.util.Scanner(inputStream, "UTF-8").useDelimiter("\\A");
            err = s.hasNext() ? s.next() : "";
        }

        try {
            logger.error("{} response code [{} {}]. content: [{}]", msg, conn.getResponseCode(), conn.getResponseMessage(), err);
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
            builder.field("cluster_name", clusterName.value());
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
            builder.field("cluster_name", clusterName.value());
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
            builder.field("cluster_name", clusterName.value());
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
            builder.field("cluster_name", clusterName.value());
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
            // events output cluster name.
            addNodeInfo(builder, "_source_node");
            events[index].addXContentBody(builder, xContentParams);
            builder.endObject();
        }
    }

    class ClusterStatsRenderer implements MultiXContentRenderer {

        ClusterStatsResponse stats;
        ToXContent.MapParams xContentParams = new ToXContent.MapParams(
                ImmutableMap.of("output_uuid", "true"));

        public void reset(ClusterStatsResponse stats) {
            this.stats = stats;
        }

        @Override
        public int length() {
            return 1;
        }

        @Override
        public String type(int i) {
            return "cluster_stats";
        }

        @Override
        public void render(int index, XContentBuilder builder) throws IOException {
            builder.startObject();
            builder.field("@timestamp", defaultDatePrinter.print(stats.getTimestamp()));
            // no node info here - we send this document home and we don't want IPs in it.
            stats.toXContent(builder, xContentParams);
            builder.endObject();
        }
    }

    /**
     * Sadly we need to make sure we keep the connection open to the target ES a
     * Java's connection pooling closes connections if idle for 5sec.
     */
    class ConnectionKeepAliveWorker implements Runnable {
        volatile boolean closed = false;

        @Override
        public void run() {
            while (!closed) {
                try {
                    Thread.sleep(1000);
                    if (closed) {
                        return;
                    }
                    HttpURLConnection conn = openConnection("GET", "");
                    if (conn != null) {
                        conn.getInputStream().close(); // close and release to connection pool.
                    }
                } catch (InterruptedException e) {
                    // ignore, if closed, good....
                } catch (Throwable t) {
                    logger.debug("error in keep alive thread", t);
                }
            }
        }
    }
}

