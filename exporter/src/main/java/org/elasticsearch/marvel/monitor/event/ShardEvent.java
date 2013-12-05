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
import org.elasticsearch.index.shard.ShardId;
import org.elasticsearch.marvel.monitor.Utils;

import java.io.IOException;
import java.util.Locale;

public class ShardEvent extends Event {

    private final ShardRouting shardRouting;
    private final ShardId shardId;
    private final DiscoveryNode node;
    private final DiscoveryNode relocatingNode; // either relocating from or relocating to (depending on event)
    private EventType event;

    public enum EventType {
        CREATED,
        STARTED,
        CLOSED
    }


    public ShardEvent(long timestamp, EventType event, ShardId shardId, DiscoveryNode node,
                      DiscoveryNode reloactingNode,
                      ShardRouting shardRouting) {
        super(timestamp);
        this.event = event;
        this.shardId = shardId;
        this.node = node;
        this.relocatingNode = reloactingNode;
        this.shardRouting = shardRouting;
    }

    @Override
    public String type() {
        return "shard_event";
    }

    @Override
    String conciseDescription() {
        switch (event) {
            case CREATED:
                // no shard routing
                return shardId + " created on" + node;
            case STARTED:
                if (relocatingNode != null) {
                    return shardId + " started on " + node + ", relocated from " + relocatingNode;
                } else {
                    return shardId + " started on " + node;
                }
            case CLOSED:
                if (relocatingNode != null) {
                    return shardId + " closed on " + node + ", relocated to " + relocatingNode;
                } else {
                    return shardId + " closed on " + node;
                }
            default:
                throw new ElasticSearchException("unmapped event type [" + event + "]");
        }
    }

    @Override
    public XContentBuilder addXContentBody(XContentBuilder builder, ToXContent.Params params) throws IOException {
        super.addXContentBody(builder, params);
        builder.field("event", event.toString().toLowerCase(Locale.ROOT));
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
            builder.startObject(event == EventType.STARTED ? "relocated_from" : "relocated_to");
            Utils.nodeToXContent(relocatingNode, builder);
            builder.endObject();
        }
        return builder;
    }
}
