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

package org.elasticsearch.marvel.agent;

import org.elasticsearch.cluster.node.DiscoveryNode;
import org.elasticsearch.common.transport.InetSocketTransportAddress;
import org.elasticsearch.common.xcontent.XContentBuilder;

import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.util.Map;

public class Utils {

    public static XContentBuilder nodeToXContent(DiscoveryNode node, XContentBuilder builder) throws IOException {
        return nodeToXContent(node, null, builder);
    }

    public static XContentBuilder nodeToXContent(DiscoveryNode node, Boolean isMasterNode, XContentBuilder builder) throws IOException {
        builder.field("id", node.id());
        builder.field("name", node.name());
        builder.field("transport_address", node.address());

        if (node.address().uniqueAddressTypeId() == 1) { // InetSocket
            InetSocketTransportAddress address = (InetSocketTransportAddress) node.address();
            InetSocketAddress inetSocketAddress = address.address();
            InetAddress inetAddress = inetSocketAddress.getAddress();
            if (inetAddress != null) {
                builder.field("ip", inetAddress.getHostAddress());
                builder.field("host", inetAddress.getHostName());
                builder.field("ip_port", inetAddress.getHostAddress() + ":" + inetSocketAddress.getPort());
            }
        } else if (node.address().uniqueAddressTypeId() == 2) {  // local transport
            builder.field("ip_port", "_" + node.address()); // will end up being "_local[ID]"
        }

        builder.field("master_node", node.isMasterNode());
        builder.field("data_node", node.isDataNode());
        if (isMasterNode != null) {
            builder.field("master", isMasterNode.booleanValue());
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
