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


import org.elasticsearch.common.joda.Joda;
import org.elasticsearch.common.joda.time.format.DateTimeFormatter;
import org.elasticsearch.common.xcontent.ToXContent;
import org.elasticsearch.common.xcontent.XContentBuilder;

import java.io.IOException;

public abstract class Event {

    public final static DateTimeFormatter datePrinter = Joda.forPattern("date_time").printer();

    protected long timestamp;
    protected String clusterName;

    public Event(long timestamp, String clusterName) {
        this.timestamp = timestamp;
        this.clusterName = clusterName;
    }

    public long timestamp() {
        return timestamp;
    }

    public String clusterName() {
        return clusterName;
    }

    /**
     * @return event's type as a short string without spaces
     */
    public abstract String type();

    /**
     * should return a short string based description of the event
     */
    abstract String conciseDescription();

    @Override
    public String toString() {
        return "[" + type() + "] event: [" + conciseDescription() + "]";
    }

    public XContentBuilder addXContentBody(XContentBuilder builder, ToXContent.Params params) throws IOException {
        builder.field("@timestamp", datePrinter.print(timestamp));
        if (params.paramAsBoolean("output_cluster_name", true)) {
            builder.field("cluster_name", clusterName);
        }
        builder.field("message", conciseDescription());
        return builder;
    }
}
