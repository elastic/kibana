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


import org.elasticsearch.cluster.routing.ShardRouting;
import org.elasticsearch.common.xcontent.ToXContent;
import org.elasticsearch.common.xcontent.XContentBuilder;
import org.elasticsearch.index.shard.ShardId;

import java.io.IOException;
import java.util.Locale;

public class ShardEvent extends Event {

    private final ShardRouting shardRouting;
    private final ShardId shardId;
    private EventType event;

    public enum EventType {
        CREATED,
        STARTED,
        CLOSED
    }


    public ShardEvent(long timestamp, EventType event, ShardId shardId, ShardRouting shardRouting) {
        super(timestamp);
        this.event = event;
        this.shardId = shardId;
        this.shardRouting = shardRouting;
    }

    @Override
    public String type() {
        return "shard_event";
    }

    @Override
    String conciseDescription() {
        return "[" + event.toString().toLowerCase(Locale.ROOT) + "]" + (shardRouting != null ? shardRouting : shardId);
    }

    @Override
    public XContentBuilder addXContentBody(XContentBuilder builder, ToXContent.Params params) throws IOException {
        super.addXContentBody(builder, params);
        builder.field("event", event.toString().toLowerCase(Locale.ROOT));
        builder.field("index", shardId.index());
        builder.field("shard_id", shardId.id());
        if (shardRouting != null) {
            builder.field("routing");
            shardRouting.toXContent(builder, params);
        }

        return builder;
    }
}
