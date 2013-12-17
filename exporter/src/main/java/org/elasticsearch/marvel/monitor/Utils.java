package org.elasticsearch.marvel.monitor;
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


import org.elasticsearch.cluster.node.DiscoveryNode;
import org.elasticsearch.common.transport.InetSocketTransportAddress;
import org.elasticsearch.common.xcontent.XContentBuilder;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.Map;

public class Utils {

    public static XContentBuilder nodeToXContent(DiscoveryNode node, XContentBuilder builder) throws IOException {
        builder.field("id", node.id());
        builder.field("name", node.name());
        builder.field("transport_address", node.address());

        if (node.address().uniqueAddressTypeId() == 1) { // InetSocket
            InetSocketTransportAddress address = (InetSocketTransportAddress) node.address();
            InetSocketAddress inetSocketAddress = address.address();
            InetAddress inetAddress = inetSocketAddress.getAddress();
            if (inetAddress != null) {
                builder.field("ip", inetAddress.getHostAddress());
                builder.field("hostname", inetAddress.getHostName());
                builder.field("ip_port", inetAddress.getHostAddress() + ":" + inetSocketAddress.getPort());
            }
        }

        if (!node.attributes().isEmpty()) {
            builder.startObject("attributes");
            for (Map.Entry<String, String> attr : node.attributes().entrySet()) {
                builder.field(attr.getKey(), attr.getValue());
            }
            builder.endObject();
        }
        return builder;
    }

    public static String nodeDescription(DiscoveryNode node) {
        StringBuilder builder = new StringBuilder().append("[").append(node.name()).append("]");
        if (node.address().uniqueAddressTypeId() == 1) { // InetSocket
            InetSocketTransportAddress address = (InetSocketTransportAddress) node.address();
            InetSocketAddress inetSocketAddress = address.address();
            InetAddress inetAddress = inetSocketAddress.getAddress();
            if (inetAddress != null) {
                builder.append("[").append(inetAddress.getHostAddress()).append(":").append(inetSocketAddress.getPort()).append("]");
            }
        }
        return builder.toString();
    }

}
