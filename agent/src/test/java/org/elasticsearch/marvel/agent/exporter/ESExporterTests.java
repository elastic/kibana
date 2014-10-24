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

import org.elasticsearch.Version;
import org.elasticsearch.action.admin.cluster.health.ClusterHealthStatus;
import org.elasticsearch.cluster.ClusterService;
import org.elasticsearch.cluster.ClusterState;
import org.elasticsearch.cluster.node.DiscoveryNode;
import org.elasticsearch.cluster.node.DiscoveryNodes;
import org.elasticsearch.common.settings.ImmutableSettings;
import org.elasticsearch.common.transport.LocalTransportAddress;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.marvel.agent.event.ClusterEvent;
import org.elasticsearch.marvel.agent.event.Event;
import org.elasticsearch.test.ElasticsearchIntegrationTest;
import org.elasticsearch.test.ElasticsearchIntegrationTest.ClusterScope;
import org.junit.Test;

import static org.elasticsearch.test.hamcrest.ElasticsearchAssertions.assertHitCount;


// Transport Client instantiation also calls the marvel plugin, which then fails to find modules
@ClusterScope(transportClientRatio = 0.0, scope = ElasticsearchIntegrationTest.Scope.TEST, numNodes = 0)
public class ESExporterTests extends ElasticsearchIntegrationTest {

    @Test
    public void testLargeClusterStateSerialization() throws InterruptedException {
        // make sure not other exporting is done (quicker)..
        cluster().startNode(ImmutableSettings.builder().put("marvel.agent.interval", "2m"));
        ESExporter esExporter = cluster().getInstance(ESExporter.class);
        DiscoveryNodes.Builder nodesBuilder = new DiscoveryNodes.Builder();
        int nodeCount = randomIntBetween(10, 200);
        for (int i = 0; i < nodeCount; i++) {
            nodesBuilder.put(new DiscoveryNode("node_" + i, new LocalTransportAddress("node_" + i), Version.CURRENT));
        }

        // get the current cluster state rather then construct one because the constructors have changed across ES versions
        ClusterService clusterService = cluster().getInstance(ClusterService.class);
        ClusterState state = ClusterState.builder(clusterService.state()).nodes(nodesBuilder).build();
        logger.info("exporting cluster state with {} nodes", state.nodes().size());
        esExporter.exportEvents(new Event[]{
                new ClusterEvent.ClusterStateChange(1234l, state, "test", ClusterHealthStatus.GREEN, "testing_1234", "test_source_unique")
        });
        logger.info("done exporting");

        ensureYellow();
        client().admin().indices().prepareRefresh(".marvel-*").get();
        assertHitCount(client().prepareSearch().setQuery(QueryBuilders.termQuery("event_source", "test_source_unique")).get(), 1);
    }
}
