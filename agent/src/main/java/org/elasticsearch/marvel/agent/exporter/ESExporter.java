/**
 * ELASTICSEARCH CONFIDENTIAL
 * _____________________________
 *
 *  [2014] Elasticsearch Incorporated All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Elasticsearch Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Elasticsearch Incorporated
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Elasticsearch Incorporated.
 */

package org.elasticsearch.marvel.agent.exporter;

import org.elasticsearch.ExceptionsHelper;
import org.elasticsearch.action.admin.cluster.node.stats.NodeStats;
import org.elasticsearch.action.admin.cluster.stats.ClusterStatsResponse;
import org.elasticsearch.action.admin.indices.stats.CommonStats;
import org.elasticsearch.action.admin.indices.stats.IndexStats;
import org.elasticsearch.action.admin.indices.stats.IndicesStatsResponse;
import org.elasticsearch.action.admin.indices.stats.ShardStats;
import org.elasticsearch.cluster.ClusterName;
import org.elasticsearch.cluster.ClusterService;
import org.elasticsearch.cluster.routing.ShardRouting;
import org.elasticsearch.cluster.settings.ClusterDynamicSettings;
import org.elasticsearch.cluster.settings.DynamicSettings;
import org.elasticsearch.common.Base64;
import org.elasticsearch.common.Nullable;
import org.elasticsearch.common.Strings;
import org.elasticsearch.common.collect.ImmutableMap;
import org.elasticsearch.common.component.AbstractLifecycleComponent;
import org.elasticsearch.common.component.Lifecycle;
import org.elasticsearch.common.inject.Inject;
import org.elasticsearch.common.io.Streams;
import org.elasticsearch.common.joda.Joda;
import org.elasticsearch.common.joda.time.format.DateTimeFormat;
import org.elasticsearch.common.joda.time.format.DateTimeFormatter;
import org.elasticsearch.common.settings.Settings;
import org.elasticsearch.common.unit.TimeValue;
import org.elasticsearch.common.util.concurrent.EsExecutors;
import org.elasticsearch.common.xcontent.*;
import org.elasticsearch.common.xcontent.smile.SmileXContent;
import org.elasticsearch.http.HttpServer;
import org.elasticsearch.marvel.agent.Utils;
import org.elasticsearch.marvel.agent.event.Event;
import org.elasticsearch.node.settings.NodeSettingsService;

import javax.net.ssl.*;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URISyntaxException;
import java.net.URL;
import java.security.KeyStore;
import java.util.ArrayList;
import java.util.Map;

public class ESExporter extends AbstractLifecycleComponent<ESExporter> implements Exporter<ESExporter>, NodeSettingsService.Listener {

    private static final String SETTINGS_PREFIX = "marvel.agent.exporter.es.";
    public static final String SETTINGS_HOSTS = SETTINGS_PREFIX + "hosts";
    public static final String SETTINGS_INDEX_PREFIX = SETTINGS_PREFIX + "index.prefix";
    public static final String SETTINGS_INDEX_TIME_FORMAT = SETTINGS_PREFIX + "index.timeformat";
    public static final String SETTINGS_TIMEOUT = SETTINGS_PREFIX + "timeout";
    public static final String SETTINGS_READ_TIMEOUT = SETTINGS_PREFIX + "read_timeout";

    volatile String[] hosts;
    volatile boolean boundToLocalNode = false;
    final String indexPrefix;
    final DateTimeFormatter indexTimeFormatter;
    volatile int timeoutInMillis;
    volatile int readTimeoutInMillis;


    /** https support * */
    final SSLSocketFactory sslSocketFactory;

    final ClusterService clusterService;
    final ClusterName clusterName;
    HttpServer httpServer;


    public final static DateTimeFormatter defaultDatePrinter = Joda.forPattern("date_time").printer();

    volatile boolean checkedAndUploadedIndexTemplate = false;

    final NodeStatsRenderer nodeStatsRenderer;
    final ShardStatsRenderer shardStatsRenderer;
    final IndexStatsRenderer indexStatsRenderer;
    final IndicesStatsRenderer indicesStatsRenderer;
    final ClusterStatsRenderer clusterStatsRenderer;
    final EventsRenderer eventsRenderer;

    final ConnectionKeepAliveWorker keepAliveWorker;
    Thread keepAliveThread;

    @Inject
    public ESExporter(Settings settings, ClusterService clusterService, ClusterName clusterName,
                      @ClusterDynamicSettings DynamicSettings dynamicSettings,
                      NodeSettingsService nodeSettingsService) {
        super(settings);

        this.clusterService = clusterService;

        this.clusterName = clusterName;

        hosts = settings.getAsArray(SETTINGS_HOSTS, Strings.EMPTY_ARRAY);

        validateHosts(hosts);

        indexPrefix = settings.get(SETTINGS_INDEX_PREFIX, ".marvel");
        String indexTimeFormat = settings.get(SETTINGS_INDEX_TIME_FORMAT, "YYYY.MM.dd");
        indexTimeFormatter = DateTimeFormat.forPattern(indexTimeFormat).withZoneUTC();

        timeoutInMillis = (int) settings.getAsTime(SETTINGS_TIMEOUT, new TimeValue(6000)).millis();
        readTimeoutInMillis = (int) settings.getAsTime(SETTINGS_READ_TIMEOUT, new TimeValue(timeoutInMillis * 10)).millis();

        nodeStatsRenderer = new NodeStatsRenderer();
        shardStatsRenderer = new ShardStatsRenderer();
        indexStatsRenderer = new IndexStatsRenderer();
        indicesStatsRenderer = new IndicesStatsRenderer();
        clusterStatsRenderer = new ClusterStatsRenderer();
        eventsRenderer = new EventsRenderer();

        keepAliveWorker = new ConnectionKeepAliveWorker();

        dynamicSettings.addDynamicSetting(SETTINGS_HOSTS + ".*");
        dynamicSettings.addDynamicSetting(SETTINGS_TIMEOUT);
        dynamicSettings.addDynamicSetting(SETTINGS_READ_TIMEOUT);
        nodeSettingsService.addListener(this);

        if (!settings.getByPrefix(SETTINGS_SSL_PREFIX).getAsMap().isEmpty() ||
                !settings.getByPrefix(SETTINGS_SSL_SHIELD_PREFIX).getAsMap().isEmpty()) {
            sslSocketFactory = createSSLSocketFactory(settings);
        } else {
            logger.trace("no ssl context configured");
            sslSocketFactory = null;
        }

        logger.debug("initialized with targets: {}, index prefix [{}], index time format [{}]",
                Utils.santizeUrlPwds(Strings.arrayToCommaDelimitedString(hosts)), indexPrefix, indexTimeFormat);
    }

    static private void validateHosts(String[] hosts) {
        for (String host : hosts) {
            try {
                Utils.parseHostWithPath(host, "");
            } catch (URISyntaxException e) {
                throw new RuntimeException("[marvel.agent.exporter] invalid host: [" + Utils.santizeUrlPwds(host) + "]." +
                        " error: [" + Utils.santizeUrlPwds(e.getMessage()) + "]");
            } catch (MalformedURLException e) {
                throw new RuntimeException("[marvel.agent.exporter] invalid host: [" + Utils.santizeUrlPwds(host) + "]." +
                        " error: [" + Utils.santizeUrlPwds(e.getMessage()) + "]");
            }
        }
    }

    @Override
    public String name() {
        return "es_exporter";
    }

    @Inject
    public void setHttpServer(HttpServer httpServer) {
        this.httpServer = httpServer;
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
            logger.error("error sending data to [{}]: [{}]", Utils.santizeUrlPwds(conn.getURL()),
                    Utils.santizeUrlPwds(ExceptionsHelper.detailedMessage(e)));
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


    private HttpURLConnection openExportingConnection() {
        logger.trace("setting up an export connection");
        HttpURLConnection conn = openAndValidateConnection("POST", getIndexName() + "/_bulk", XContentType.SMILE.restContentType());
        if (conn != null && (keepAliveThread == null || !keepAliveThread.isAlive())) {
            // start keep alive upon successful connection if not there.
            initKeepAliveThread();
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
                    .field("_type", renderer.type(i))
                    .endObject().endObject();
            builder.close();
            builder.bytes().writeTo(os);
            os.write(SmileXContent.smileXContent.streamSeparator());

            builder = XContentFactory.smileBuilder();
            builder.humanReadable(false);
            renderer.render(i, builder);
            builder.close();
            builder.bytes().writeTo(os);
            os.write(SmileXContent.smileXContent.streamSeparator());
        }
    }

    @SuppressWarnings("unchecked")
    private void sendCloseExportingConnection(HttpURLConnection conn) throws IOException {
        logger.trace("sending content");
        OutputStream os = conn.getOutputStream();
        os.close();
        if (conn.getResponseCode() != 200) {
            logConnectionError("remote target didn't respond with 200 OK", conn);
            return;
        }

        InputStream inputStream = conn.getInputStream();
        XContentParser parser = XContentType.SMILE.xContent().createParser(inputStream);
        Map<String, Object> response = parser.mapAndClose();
        if (response.get("items") != null) {
            ArrayList<Object> list = (ArrayList<Object>) response.get("items");
            for (Object itemObject : list) {
                Map<String, Object> actions = (Map<String, Object>) itemObject;
                for (String actionKey : actions.keySet()) {
                    Map<String, Object> action = (Map<String, Object>) actions.get(actionKey);
                    if (action.get("error") != null) {
                        logger.error("{} failure (index:[{}] type: [{}]): {}", actionKey, action.get("_index"), action.get("_type"), action.get("error"));
                    }
                }
            }
        }
        parser.close();
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
            logger.error("error sending data to [{}]: {}", Utils.santizeUrlPwds(conn.getURL()), Utils.santizeUrlPwds(ExceptionsHelper.detailedMessage(e)));
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
        if (keepAliveThread != null && keepAliveThread.isAlive()) {
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

    // used for testing
    String[] getHosts() {
        return hosts;
    }

    private String getIndexName() {
        return indexPrefix + "-" + indexTimeFormatter.print(System.currentTimeMillis());

    }

    /**
     * open a connection to any host, validating it has the template installed if needed
     *
     * @return a url connection to the selected host or null if no current host is available.
     */
    private HttpURLConnection openAndValidateConnection(String method, String path) {
        return openAndValidateConnection(method, path, null);
    }

    /**
     * open a connection to any host, validating it has the template installed if needed
     *
     * @return a url connection to the selected host or null if no current host is available.
     */
    private HttpURLConnection openAndValidateConnection(String method, String path, String contentType) {
        if (hosts.length == 0) {
            if (httpServer == null) {
                logger.debug("local http server is not yet injected. can't connect.");
                return null;
            }

            String[] extractedHosts = Utils.extractHostsFromHttpServer(httpServer, logger);
            if (extractedHosts == null || extractedHosts.length == 0) {
                return null;
            }
            hosts = extractedHosts;
            logger.trace("auto-resolved hosts to {}", extractedHosts);
            boundToLocalNode = true;
        }

        // it's important to have boundToLocalNode persistent to prevent calls during shutdown (causing ugly exceptions)
        if (boundToLocalNode && httpServer.lifecycleState() != Lifecycle.State.STARTED) {
            logger.debug("local node http server is not started. can't connect");
            return null;
        }

        // out of for to move faulty hosts to the end
        int hostIndex = 0;
        try {
            for (; hostIndex < hosts.length; hostIndex++) {
                String host = hosts[hostIndex];
                if (!checkedAndUploadedIndexTemplate) {
                    // check templates first on the host
                    checkedAndUploadedIndexTemplate = checkAndUploadIndexTemplate(host);
                    if (!checkedAndUploadedIndexTemplate) {
                        continue;
                    }
                }
                HttpURLConnection connection = openConnection(host, method, path, contentType);
                if (connection != null) {
                    return connection;
                }
                // failed hosts - reset template check , someone may have restarted the target cluster and deleted
                // it's data folder. be safe.
                checkedAndUploadedIndexTemplate = false;
            }
        } finally {
            if (hostIndex > 0 && hostIndex < hosts.length) {
                logger.debug("moving [{}] failed hosts to the end of the list", hostIndex);
                String[] newHosts = new String[hosts.length];
                System.arraycopy(hosts, hostIndex, newHosts, 0, hosts.length - hostIndex);
                System.arraycopy(hosts, 0, newHosts, hosts.length - hostIndex, hostIndex);
                hosts = newHosts;
                logger.debug("preferred target host is now [{}]", Utils.santizeUrlPwds(hosts[0]));
            }
        }

        logger.error("could not connect to any configured elasticsearch instances: [{}]", Utils.santizeUrlPwds(Strings.arrayToCommaDelimitedString(hosts)));

        return null;

    }

    /** open a connection to the given hosts, returning null when not successful * */
    private HttpURLConnection openConnection(String host, String method, String path, @Nullable String contentType) {
        try {
            final URL url = Utils.parseHostWithPath(host, path);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();

            if (conn instanceof HttpsURLConnection && sslSocketFactory != null) {
                HttpsURLConnection httpsConn = (HttpsURLConnection) conn;
                httpsConn.setSSLSocketFactory(sslSocketFactory);
            }

            conn.setRequestMethod(method);
            conn.setConnectTimeout(timeoutInMillis);
            conn.setReadTimeout(readTimeoutInMillis);
            if (contentType != null) {
                conn.setRequestProperty("Content-Type", contentType);
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
        } catch (URISyntaxException e) {
            logErrorBasedOnLevel(e, "error parsing host [{}]", Utils.santizeUrlPwds(host));
        } catch (IOException e) {
            logErrorBasedOnLevel(e, "error connecting to [{}]", Utils.santizeUrlPwds(host));
        }
        return null;
    }

    private void logErrorBasedOnLevel(Throwable t, String msg, Object... params) {
        logger.error(msg + " [" + Utils.santizeUrlPwds(t.getMessage()) + "]", params);
        if (logger.isDebugEnabled()) {
            logger.debug(msg + ". full error details:\n[{}]", params, Utils.santizeUrlPwds(ExceptionsHelper.detailedMessage(t)));
        }
    }


    /**
     * Checks if the index templates already exist and if not uploads it
     * Any critical error that should prevent data exporting is communicated via an exception.
     *
     * @return true if template exists or was uploaded successfully.
     */
    private boolean checkAndUploadIndexTemplate(final String host) {
        byte[] template;
        try {
            template = Streams.copyToBytesFromClasspath("/marvel_index_template.json");
        } catch (IOException e) {
            // throwing an exception to stop exporting process - we don't want to send data unless
            // we put in the template for it.
            throw new RuntimeException("failed to load marvel_index_template.json", e);
        }

        try {
            int expectedVersion = Utils.parseIndexVersionFromTemplate(template);
            if (expectedVersion < 0) {
                throw new RuntimeException("failed to find an index version in pre-configured index template");
            }
            HttpURLConnection conn = openConnection(host, "GET", "_template/marvel", null);
            if (conn == null) {
                return false;
            }

            boolean hasTemplate = false;
            if (conn.getResponseCode() == 200) {
                // verify content.
                InputStream is = conn.getInputStream();
                byte[] existingTemplate = Streams.copyToByteArray(is);
                is.close();
                int foundVersion = Utils.parseIndexVersionFromTemplate(existingTemplate);
                if (foundVersion < 0) {
                    logger.warn("found an existing index template but couldn't extract it's version. leaving it as is.");
                    hasTemplate = true;
                } else if (foundVersion >= expectedVersion) {
                    logger.debug("accepting existing index template (version [{}], needed [{}])", foundVersion, expectedVersion);
                    hasTemplate = true;
                } else {
                    logger.debug("replacing existing index template (version [{}], needed [{}])", foundVersion, expectedVersion);
                }
            }
            // nothing there, lets create it
            if (!hasTemplate) {
                logger.debug("uploading index template");
                conn = openConnection(host, "PUT", "_template/marvel", XContentType.JSON.restContentType());
                OutputStream os = conn.getOutputStream();
                Streams.copy(template, os);
                if (!(conn.getResponseCode() == 200 || conn.getResponseCode() == 201)) {
                    logConnectionError("error adding the marvel template to [" + host + "]", conn);
                } else {
                    hasTemplate = true;
                }
                conn.getInputStream().close(); // close and release to connection pool.
            }

            return hasTemplate;
        } catch (IOException e) {
            logger.error("failed to verify/upload the marvel template to [{}]:\n{}", Utils.santizeUrlPwds(host), Utils.santizeUrlPwds(e.getMessage()));
            return false;
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
            logger.error("{} response code [{} {}]. content: [{}]",
                    Utils.santizeUrlPwds(msg), conn.getResponseCode(),
                    Utils.santizeUrlPwds(conn.getResponseMessage()),
                    Utils.santizeUrlPwds(err));
        } catch (IOException e) {
            logger.error("{}. connection had an error while reporting the error. tough life.", Utils.santizeUrlPwds(msg));
        }
    }

    @Override
    public void onRefreshSettings(Settings settings) {
        TimeValue newTimeout = settings.getAsTime(SETTINGS_TIMEOUT, null);
        if (newTimeout != null) {
            logger.info("connection timeout set to [{}]", newTimeout);
            timeoutInMillis = (int) newTimeout.millis();
        }

        newTimeout = settings.getAsTime(SETTINGS_READ_TIMEOUT, null);
        if (newTimeout != null) {
            logger.info("connection read timeout set to [{}]", newTimeout);
            readTimeoutInMillis = (int) newTimeout.millis();
        }

        String[] newHosts = settings.getAsArray(SETTINGS_HOSTS, null);
        if (newHosts != null) {
            logger.info("hosts set to [{}]", Utils.santizeUrlPwds(Strings.arrayToCommaDelimitedString(newHosts)));
            this.hosts = newHosts;
            this.checkedAndUploadedIndexTemplate = false;
            this.boundToLocalNode = false;
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
        Utils.nodeToXContent(clusterService.localNode(), clusterService.state().nodes().localNodeMaster(), builder);
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

    protected void initKeepAliveThread() {
        keepAliveThread = new Thread(keepAliveWorker, EsExecutors.threadName(settings, "keep_alive"));
        keepAliveThread.setDaemon(true);
        keepAliveThread.start();
    }

    /**
     * Sadly we need to make sure we keep the connection open to the target ES a
     * Java's connection pooling closes connections if idle for 5sec.
     */
    class ConnectionKeepAliveWorker implements Runnable {
        volatile boolean closed = false;

        @Override
        public void run() {
            logger.trace("starting keep alive thread");
            while (!closed) {
                try {
                    Thread.sleep(1000);
                    if (closed) {
                        return;
                    }
                    String[] currentHosts = hosts;
                    if (currentHosts.length == 0) {
                        logger.trace("keep alive thread shutting down. no hosts defined");
                        return; // no hosts configured at the moment.
                    }
                    HttpURLConnection conn = openConnection(currentHosts[0], "GET", "", null);
                    if (conn == null) {
                        logger.trace("keep alive thread shutting down. failed to open connection to current host [{}]", Utils.santizeUrlPwds(currentHosts[0]));
                        return;
                    } else {
                        conn.getInputStream().close(); // close and release to connection pool.
                    }
                } catch (InterruptedException e) {
                    // ignore, if closed, good....
                } catch (Throwable t) {
                    logger.debug("error in keep alive thread, shutting down (will be restarted after a successful connection has been made) {}",
                            Utils.santizeUrlPwds(ExceptionsHelper.detailedMessage(t)));
                    return;
                }
            }
        }
    }

    private static final String SETTINGS_SSL_PREFIX = SETTINGS_PREFIX + "ssl.";
    private static final String SETTINGS_SSL_SHIELD_PREFIX = "shield.ssl.";

    public static final String SETTINGS_SSL_PROTOCOL = SETTINGS_SSL_PREFIX + "protocol";
    private static final String SETTINGS_SSL_SHIELD_CONTEXT_ALGORITHM = SETTINGS_SSL_SHIELD_PREFIX + "context.algorithm";
    public static final String SETTINGS_SSL_TRUSTSTORE = SETTINGS_SSL_PREFIX + "truststore.path";
    private static final String SETTINGS_SSL_SHIELD_TRUSTSTORE = SETTINGS_SSL_SHIELD_PREFIX + "truststore.path";
    public static final String SETTINGS_SSL_TRUSTSTORE_PASSWORD = SETTINGS_SSL_PREFIX + "truststore.password";
    private static final String SETTINGS_SSL_SHIELD_TRUSTSTORE_PASSWORD = SETTINGS_SSL_SHIELD_PREFIX + "truststore.password";
    public static final String SETTINGS_SSL_TRUSTSTORE_ALGORITHM = SETTINGS_SSL_PREFIX + "truststore.algorithm";
    private static final String SETTINGS_SSL_SHIELD_TRUSTSTORE_ALGORITHM = SETTINGS_SSL_SHIELD_PREFIX + "truststore.algorithm";


    /** SSL Initialization * */
    public SSLSocketFactory createSSLSocketFactory(Settings settings) {
        SSLContext sslContext;
        // Initialize sslContext
        try {
            String sslContextProtocol = settings.get(SETTINGS_SSL_PROTOCOL, settings.get(SETTINGS_SSL_SHIELD_CONTEXT_ALGORITHM, "TLS"));
            String trustStore = settings.get(SETTINGS_SSL_TRUSTSTORE, settings.get(SETTINGS_SSL_SHIELD_TRUSTSTORE, System.getProperty("javax.net.ssl.trustStore")));
            String trustStorePassword = settings.get(SETTINGS_SSL_TRUSTSTORE_PASSWORD, settings.get(SETTINGS_SSL_SHIELD_TRUSTSTORE_PASSWORD, System.getProperty("javax.net.ssl.trustStorePassword")));
            String trustStoreAlgorithm = settings.get(SETTINGS_SSL_TRUSTSTORE_ALGORITHM, settings.get(SETTINGS_SSL_SHIELD_TRUSTSTORE_ALGORITHM, System.getProperty("ssl.TrustManagerFactory.algorithm")));

            if (trustStore == null) {
                throw new RuntimeException("truststore is not configured, use " + SETTINGS_SSL_TRUSTSTORE);
            }

            if (trustStoreAlgorithm == null) {
                trustStoreAlgorithm = TrustManagerFactory.getDefaultAlgorithm();
            }

            logger.debug("SSL: using trustStore[{}], trustAlgorithm[{}]", trustStore, trustStoreAlgorithm);

            if (!new File(trustStore).exists()) {
                throw new FileNotFoundException("Truststore at path [" + trustStore + "] does not exist");
            }

            FileInputStream trustStoreStream = null;
            TrustManager[] trustManagers;
            try {
                trustStoreStream = new FileInputStream(trustStore);
                // Load TrustStore
                KeyStore ks = KeyStore.getInstance("jks");
                ks.load(trustStoreStream, trustStorePassword == null ? null : trustStorePassword.toCharArray());

                // Initialize a trust manager factory with the trusted store
                TrustManagerFactory trustFactory = TrustManagerFactory.getInstance(trustStoreAlgorithm);
                trustFactory.init(ks);

                // Retrieve the trust managers from the factory
                trustManagers = trustFactory.getTrustManagers();
            } catch (Exception e) {
                throw new RuntimeException("Failed to initialize a TrustManagerFactory", e);
            } finally {
                if (trustStoreStream != null) {
                    trustStoreStream.close();
                }
            }

            sslContext = SSLContext.getInstance(sslContextProtocol);
            sslContext.init(null, trustManagers, null);
        } catch (Exception e) {
            throw new RuntimeException("[marvel.agent.exporter] failed to initialize the SSLContext", e);
        }
        return sslContext.getSocketFactory();
    }
}

