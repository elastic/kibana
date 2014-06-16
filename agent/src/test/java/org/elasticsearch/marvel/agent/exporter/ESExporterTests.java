package org.elasticsearch.marvel.agent.exporter;

import org.elasticsearch.Version;
import org.elasticsearch.action.admin.cluster.health.ClusterHealthStatus;
import org.elasticsearch.cluster.ClusterService;
import org.elasticsearch.cluster.ClusterState;
import org.elasticsearch.cluster.node.DiscoveryNode;
import org.elasticsearch.cluster.node.DiscoveryNodes;
import org.elasticsearch.common.io.Streams;
import org.elasticsearch.common.transport.DummyTransportAddress;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.marvel.agent.event.ClusterEvent;
import org.elasticsearch.marvel.agent.event.Event;
import org.elasticsearch.test.ElasticsearchIntegrationTest;
import org.elasticsearch.test.ElasticsearchIntegrationTest.ClusterScope;
import org.hamcrest.MatcherAssert;
import org.hamcrest.Matchers;
import org.junit.Test;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;

import static org.elasticsearch.test.hamcrest.ElasticsearchAssertions.assertHitCount;


// Transport Client instantiation also calls the marvel plugin, which then fails to find modules
@ClusterScope(transportClientRatio = 0.0, scope = ElasticsearchIntegrationTest.Scope.SUITE)
public class ESExporterTests extends ElasticsearchIntegrationTest {

    @Test
    public void testVersionIsExtractableFromIndexTemplate() throws IOException {
        byte[] template;
        InputStream is = ESExporter.class.getResourceAsStream("/marvel_index_template.json");
        if (is == null) {
            throw new FileNotFoundException("Resource [/marvel_index_template.json] not found in classpath");
        }
        template = Streams.copyToByteArray(is);
        is.close();
        MatcherAssert.assertThat(ESExporter.parseIndexVersionFromTemplate(template), Matchers.greaterThan(0));
    }

    @Test
    public void testLargeClusterStateSerialization() throws InterruptedException {
        ESExporter esExporter = cluster().getInstance(ESExporter.class);
        DiscoveryNodes.Builder nodesBuilder = new DiscoveryNodes.Builder();
        for (int i = 0; i < randomIntBetween(10, 10000); i++) {
            nodesBuilder.put(new DiscoveryNode("node_" + i, DummyTransportAddress.INSTANCE, Version.CURRENT));
        }

        // get the current cluster state rather then construct one because the constructors have changed accross ES versions
        ClusterService clusterService = cluster().getInstance(ClusterService.class);
        ClusterState state = ClusterState.builder(clusterService.state()).nodes(nodesBuilder).build();
        logger.info("exporting cluster state with {} nodes", state.nodes().size());
        esExporter.exportEvents(new Event[]{
                new ClusterEvent.ClusterStateChange(1234l, state, "test", ClusterHealthStatus.GREEN, "testing_1234", "test_source_unique")
        });
        logger.info("done exporting");

        ensureGreen();
        client().admin().indices().prepareRefresh(".marvel-*").get();
        assertHitCount(client().prepareSearch().setQuery(QueryBuilders.termQuery("event_source", "test_source_unique")).get(), 1);

    }
}
