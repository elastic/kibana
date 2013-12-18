package org.elasticsearch.marvel.monitor.event;
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


import org.elasticsearch.action.admin.cluster.health.ClusterIndexHealth;
import org.elasticsearch.common.collect.ImmutableMap;
import org.elasticsearch.common.xcontent.ToXContent;
import org.elasticsearch.common.xcontent.XContentBuilder;

import java.io.IOException;
import java.util.Map;

public abstract class IndexEvent extends Event {

    protected final String event_source;

    public IndexEvent(long timestamp, String clusterName, String event_source) {
        super(timestamp, clusterName);
        this.event_source = event_source;
    }

    @Override
    public String type() {
        return "index_event";
    }

    protected abstract String event();

    @Override
    public XContentBuilder addXContentBody(XContentBuilder builder, ToXContent.Params params) throws IOException {
        super.addXContentBody(builder, params);
        builder.field("event", event());
        builder.field("event_source", event_source);
        return builder;
    }

    public static class IndexCreateDelete extends IndexEvent {

        private final String index;
        private boolean created;

        public IndexCreateDelete(long timestamp, String clusterName, String index, boolean created, String event_source) {
            super(timestamp, clusterName, event_source);
            this.index = index;
            this.created = created;
        }

        @Override
        protected String event() {
            return (created ? "index_created" : "index_deleted");
        }

        @Override
        String conciseDescription() {
            return "[" + index + "] " + (created ? " created" : " deleted");
        }

        @Override
        public XContentBuilder addXContentBody(XContentBuilder builder, ToXContent.Params params) throws IOException {
            super.addXContentBody(builder, params);
            builder.field("index", index);
            return builder;
        }
    }

    public static class IndexStatus extends IndexEvent {

        ClusterIndexHealth indexHealth;

        Map<String, String> SHARD_LEVEL_MAP = ImmutableMap.of("level", "shards");

        public IndexStatus(long timestamp, String clusterName, String event_source, ClusterIndexHealth indexHealth) {
            super(timestamp, clusterName, event_source);
            this.indexHealth = indexHealth;
        }

        @Override
        protected String event() {
            return "index_status";
        }

        @Override
        String conciseDescription() {
            return "[" + indexHealth.getIndex() + "] status is " + indexHealth.getStatus().name();
        }

        @Override
        public XContentBuilder addXContentBody(XContentBuilder builder, ToXContent.Params params) throws IOException {
            super.addXContentBody(builder, params);
            builder.field("index", indexHealth.getIndex());
            return indexHealth.toXContent(builder, new ToXContent.DelegatingMapParams(SHARD_LEVEL_MAP, params));
        }
    }
}
