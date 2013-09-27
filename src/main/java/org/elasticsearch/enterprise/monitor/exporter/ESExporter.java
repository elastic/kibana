package org.elasticsearch.enterprise.monitor.exporter;
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


import org.elasticsearch.common.collect.ImmutableMap;
import org.elasticsearch.ElasticSearchException;
import org.elasticsearch.ElasticSearchIllegalArgumentException;
import org.elasticsearch.action.admin.cluster.node.stats.NodeStats;
import org.elasticsearch.action.admin.indices.stats.ShardStats;
import org.elasticsearch.cluster.ClusterName;
import org.elasticsearch.common.component.AbstractLifecycleComponent;
import org.elasticsearch.common.logging.ESLogger;
import org.elasticsearch.common.logging.ESLoggerFactory;
import org.elasticsearch.common.settings.Settings;
import org.elasticsearch.common.xcontent.ToXContent;
import org.elasticsearch.common.xcontent.XContentBuilder;
import org.elasticsearch.common.xcontent.XContentFactory;
import org.elasticsearch.common.xcontent.XContentType;

import java.io.IOException;
import java.io.OutputStream;
import java.io.UnsupportedEncodingException;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLEncoder;
import java.util.*;

public class ESExporter extends AbstractLifecycleComponent<ESExporter> implements StatsExporter<ESExporter> {

    final String targetHost;
    final int targetPort;

    final String targetPathPrefix;
    final ClusterName clusterName;

    final ESLogger logger = ESLoggerFactory.getLogger(ESExporter.class.getName());

    final ToXContent.Params xContentParams;


    public ESExporter(Settings settings, ClusterName clusterName) {
        super(settings);

        this.clusterName = clusterName;

        // TODO: move to a single settings.
        targetHost = settings.get("target.host", "localhost");
        targetPort = settings.getAsInt("target.post", 9200);
        String targetIndexPrefix = settings.get("target.index.prefix", "");

        try {
            if (!targetIndexPrefix.isEmpty()) targetIndexPrefix += targetIndexPrefix + "_";
            targetPathPrefix = "/"+ URLEncoder.encode(targetIndexPrefix,"UTF-8") + URLEncoder.encode(clusterName.value(),"UTF-8");

        } catch (UnsupportedEncodingException e) {
            throw new ElasticSearchException("Can't encode target url", e);
        }


        xContentParams = new ToXContent.MapParams(ImmutableMap.of("human_readable", "false"));


        logger.info("ESExporter initialized. Target: {}:{} Index prefix set to {}", targetHost, targetPort, targetIndexPrefix );
        // explode early on broken settings
        getTargetURL("test");

    }

    private URL getTargetURL(String type) {
        try {
            String path = String.format("%1$s%2$tY.%2$tm.%2$td/%3$s", targetPathPrefix, new Date(), type);
            return new URL("http", targetHost, targetPort, path);
        } catch (MalformedURLException e) {
            throw new ElasticSearchIllegalArgumentException("Target settings result in a malformed url");
        }
    }

    @Override
    public String name() {
        return "ESExporter";
    }


    @Override
    public void exportNodeStats(NodeStats nodeStats) {
        exportXContent("nodestats", nodeStats);
    }

    @Override
    public void exportShardStats(ShardStats shardStats) {
        //exportXContent("shardstats", shardStats);
    }

    private void exportXContent(String type,ToXContent xContent) {
        URL url = getTargetURL(type);
        logger.debug("Exporting {} to {}", type, url);
        HttpURLConnection conn;
        try {
            conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", XContentType.SMILE.restContentType());
            OutputStream os = conn.getOutputStream();
            XContentBuilder builder = XContentFactory.smileBuilder(os);

            builder.startObject();
            xContent.toXContent(builder, xContentParams);
            builder.endObject();

            builder.close();

            if (conn.getResponseCode() != 201) {
                logger.error("Remote target didn't respond with 201 Created");
            }
            conn.getInputStream().close(); // close and release to connection pool.

        } catch (IOException e) {
            logger.error("Error connecting to target", e);
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

}
