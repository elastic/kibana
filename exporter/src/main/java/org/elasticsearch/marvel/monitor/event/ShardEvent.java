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


import org.elasticsearch.ElasticSearchException;
import org.elasticsearch.cluster.node.DiscoveryNode;
import org.elasticsearch.cluster.routing.ShardRouting;
import org.elasticsearch.common.xcontent.ToXContent;
import org.elasticsearch.common.xcontent.XContentBuilder;
import org.elasticsearch.index.shard.IndexShardState;
import org.elasticsearch.index.shard.ShardId;
import org.elasticsearch.marvel.monitor.Utils;

import java.io.IOException;
import java.util.Locale;

public class ShardEvent extends Event {

    private final ShardRouting shardRouting;
    private final ShardId shardId;
    private final String reason;
    private final DiscoveryNode node;
    private final DiscoveryNode relocatingNode; // either relocating from or relocating to (depending on event)
    private IndexShardState shardState;


    public ShardEvent(long timestamp, String clusterName, IndexShardState shardState, ShardId shardId, DiscoveryNode node,
                      DiscoveryNode relocatingNode, ShardRouting shardRouting, String reason) {
        super(timestamp, clusterName);
        this.shardState = shardState;
        this.shardId = shardId;
        this.reason = reason;
        this.node = node;
        this.relocatingNode = relocatingNode;
        this.shardRouting = shardRouting;
    }

    @Override
    public String type() {
        return "shard_event";
    }

    @Override
    String conciseDescription() {
        switch (shardState) {
            case CREATED:
                // no shard routing
                return new DescriptionBuilder(shardId, "created", node).build();
            case RECOVERING:
                return new DescriptionBuilder(shardRouting, "entered recovery", node).relocatedFrom(relocatingNode).build();
            case POST_RECOVERY:
                return new DescriptionBuilder(shardRouting, "entered post_recovery", node).relocatedFrom(relocatingNode).build();
            case STARTED:
                return new DescriptionBuilder(shardRouting, "started", node).relocatedFrom(relocatingNode).build();
            case RELOCATED:
                return new DescriptionBuilder(shardRouting, "relocated", node).relocatedTo(relocatingNode).build();
            case CLOSED:
                return new DescriptionBuilder(shardRouting, "closed", node).relocatedTo(relocatingNode).build();
            default:
                throw new ElasticSearchException("unmapped shard event type [" + shardState + "]");
        }
    }

    @Override
    public XContentBuilder addXContentBody(XContentBuilder builder, ToXContent.Params params) throws IOException {
        super.addXContentBody(builder, params);
        builder.field("event", shardState.name().toLowerCase(Locale.ROOT));
        builder.field("reason", reason);
        builder.field("index", shardId.index());
        builder.field("shard_id", shardId.id());
        builder.startObject("node");
        Utils.nodeToXContent(node, builder);
        builder.endObject();
        if (shardRouting != null) {
            builder.field("routing");
            shardRouting.toXContent(builder, params);
        }
        if (relocatingNode != null) {
            if (shardState == IndexShardState.RELOCATED || shardState == IndexShardState.CLOSED) {
                builder.startObject("relocated_to");
            } else {
                builder.startObject("relocated_from");
            }
            Utils.nodeToXContent(relocatingNode, builder);
            builder.endObject();
        }
        return builder;
    }

    private static class DescriptionBuilder {

        private final StringBuilder description = new StringBuilder();

        DescriptionBuilder(ShardId shardId, String changeDescription, DiscoveryNode node) {
            description.append(shardId).append(' ').append(changeDescription).append(" on ")
                    .append(Utils.nodeDescription(node));
        }

        DescriptionBuilder(ShardRouting shardRouting, String changeDescription, DiscoveryNode node) {
            description.append(shardRouting.shardId());
            if (shardRouting.primary()) {
                description.append("[P]");
            } else {
                description.append("[R]");
            }
            description.append(' ').append(changeDescription).append(" on ")
                    .append(Utils.nodeDescription(node));
        }

        DescriptionBuilder relocatedFrom(DiscoveryNode node) {
            if (node != null) {
                description.append(", relocated from ").append(Utils.nodeDescription(node));
            }
            return this;
        }

        DescriptionBuilder relocatedTo(DiscoveryNode node) {
            if (node != null) {
                description.append(", relocated to ").append(Utils.nodeDescription(node));
            }
            return this;
        }

        String build() {
            String description = this.description.toString();
            this.description.setLength(0);
            return description;
        }
    }
}
