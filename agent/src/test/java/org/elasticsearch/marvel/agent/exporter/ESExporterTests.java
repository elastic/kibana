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

import org.apache.lucene.util.LuceneTestCase;
import org.elasticsearch.Version;
import org.elasticsearch.action.admin.cluster.health.ClusterHealthStatus;
import org.elasticsearch.cluster.ClusterService;
import org.elasticsearch.cluster.ClusterState;
import org.elasticsearch.cluster.metadata.IndexTemplateMetaData;
import org.elasticsearch.cluster.node.DiscoveryNode;
import org.elasticsearch.cluster.node.DiscoveryNodes;
import org.elasticsearch.common.Strings;
import org.elasticsearch.common.base.Predicate;
import org.elasticsearch.common.settings.ImmutableSettings;
import org.elasticsearch.common.settings.Settings;
import org.elasticsearch.common.transport.LocalTransportAddress;
import org.elasticsearch.index.query.QueryBuilders;
import org.elasticsearch.marvel.agent.AgentService;
import org.elasticsearch.marvel.agent.event.ClusterEvent;
import org.elasticsearch.marvel.agent.event.Event;
import org.elasticsearch.test.ElasticsearchIntegrationTest;
import org.elasticsearch.test.ElasticsearchIntegrationTest.ClusterScope;
import org.hamcrest.Matchers;
import org.junit.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.concurrent.atomic.AtomicLong;

import static org.elasticsearch.test.hamcrest.ElasticsearchAssertions.assertAcked;
import static org.elasticsearch.test.hamcrest.ElasticsearchAssertions.assertHitCount;


// Transport Client instantiation also calls the marvel plugin, which then fails to find modules
@ClusterScope(transportClientRatio = 0.0, scope = ElasticsearchIntegrationTest.Scope.TEST, numNodes = 0)
public class ESExporterTests extends ElasticsearchIntegrationTest {

    @Test
    public void testHttpServerOff() {
        ImmutableSettings.Builder builder = ImmutableSettings.builder()
                .put(AgentService.SETTINGS_INTERVAL, "200m")
                .put("http.enabled", "false");
        cluster().startNode(builder);
        ESExporter esExporter = getEsExporter();
        logger.info("trying exporting despite of no target");
        esExporter.exportEvents(new Event[]{
                new TestEvent()
        });
    }

    @Test
    public void testLargeClusterStateSerialization() throws InterruptedException {
        // make sure no other exporting is done (quicker)..
        cluster().startNode(ImmutableSettings.builder().put(AgentService.SETTINGS_INTERVAL, "200m"));
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

    @Test
    @LuceneTestCase.Slow
    public void testTemplateAdditionDespiteOfLateClusterForming() {
        ImmutableSettings.Builder builder = ImmutableSettings.builder()
                .put(AgentService.SETTINGS_INTERVAL, "200m")
                .put("discovery.type", "zen")
                .put("discovery.zen.ping_timeout", "1s")
                .put("discovery.initial_state_timeout", "100ms")
                .put("discovery.zen.minimum_master_nodes", 2)
                .put(ESExporter.SETTINGS_BULK_TIMEOUT, "1s")
                .put(ESExporter.SETTINGS_CHECK_TEMPLATE_TIMEOUT, "1s");
        cluster().startNode(builder);

        ESExporter esExporter = getEsExporter();
        logger.info("exporting events while there is no cluster");
        esExporter.exportEvents(new Event[]{
                new TestEvent()
        });
        logger.info("bringing up a second node");
        cluster().startNode(builder);
        ensureGreen();
        logger.info("exporting a second event");
        esExporter.exportEvents(new Event[]{
                new TestEvent()
        });
        logger.info("verifying template is inserted");
        assertMarvelTemplate();
    }

    private void assertMarvelTemplate() {
        boolean found;
        found = findMarvelTemplate();
        assertTrue("failed to find a template named `marvel`", found);
    }

    private boolean findMarvelTemplate() {
        for (IndexTemplateMetaData template : client().admin().indices().prepareGetTemplates("marvel").get().getIndexTemplates()) {
            if (template.getName().equals("marvel")) {
                return true;
            }
        }
        return false;
    }


    @Test
    public void testDynamicHostChange() {
        // disable exporting to be able to use non valid hosts
        ImmutableSettings.Builder builder = ImmutableSettings.builder()
                .put(AgentService.SETTINGS_INTERVAL, "-1");
        cluster().startNode(builder);

        ESExporter esExporter = getEsExporter();

        assertAcked(client().admin().cluster().prepareUpdateSettings().setTransientSettings(ImmutableSettings.builder().put(ESExporter.SETTINGS_HOSTS, "test1")));
        assertThat(esExporter.getHosts(), Matchers.arrayContaining("test1"));

        // wipes the non array settings
        assertAcked(client().admin().cluster().prepareUpdateSettings().setTransientSettings(ImmutableSettings.builder()
                .putArray(ESExporter.SETTINGS_HOSTS, "test2").put(ESExporter.SETTINGS_HOSTS, "")));
        assertThat(esExporter.getHosts(), Matchers.arrayContaining("test2"));

        assertAcked(client().admin().cluster().prepareUpdateSettings().setTransientSettings(ImmutableSettings.builder().putArray(ESExporter.SETTINGS_HOSTS, "test3")));
        assertThat(esExporter.getHosts(), Matchers.arrayContaining("test3"));
    }

    @Test
    public void testHostChangeReChecksTemplate() {
        ImmutableSettings.Builder builder = ImmutableSettings.builder()
                .put(AgentService.SETTINGS_INTERVAL, "200m");
        cluster().startNode(builder);

        ESExporter esExporter = getEsExporter();

        logger.info("exporting an event");
        esExporter.exportEvents(new Event[]{
                new TestEvent()
        });
        logger.info("removing the marvel template");

        assertAcked(client().admin().indices().prepareDeleteTemplate("marvel").get());

        assertAcked(client().admin().cluster().prepareUpdateSettings().setTransientSettings(
                ImmutableSettings.builder().putArray(ESExporter.SETTINGS_HOSTS, esExporter.getHosts())).get());

        logger.info("exporting a second event");
        esExporter.exportEvents(new Event[]{
                new TestEvent()
        });
        logger.info("verifying template is inserted");
        assertMarvelTemplate();
    }

    @Test
    public void testHostFailureChecksTemplate() throws InterruptedException {
        ImmutableSettings.Builder builder = ImmutableSettings.builder()
                .put(AgentService.SETTINGS_INTERVAL, "200m");
        final String node0 = cluster().startNode(builder);
        String node1 = cluster().startNode(builder);

        ESExporter esExporter0 = getEsExporter(node0);
        final ESExporter esExporter1 = getEsExporter(node1);

        logger.info("--> exporting events to force host resolution");
        esExporter0.exportEvents(new Event[]{
                new TestEvent()
        });
        esExporter1.exportEvents(new Event[]{
                new TestEvent()
        });

        logger.info("--> setting exporting hosts to {} + {}", esExporter0.getHosts(), esExporter1.getHosts());
        ArrayList<String> mergedHosts = new ArrayList<String>();
        mergedHosts.addAll(Arrays.asList(esExporter0.getHosts()));
        mergedHosts.addAll(Arrays.asList(esExporter1.getHosts()));

        assertAcked(client().admin().cluster().prepareUpdateSettings().setTransientSettings(
                ImmutableSettings.builder().putArray(ESExporter.SETTINGS_HOSTS, mergedHosts.toArray(Strings.EMPTY_ARRAY))).get());

        logger.info("--> exporting events to have new settings take effect");
        esExporter0.exportEvents(new Event[]{
                new TestEvent()
        });
        esExporter1.exportEvents(new Event[]{
                new TestEvent()
        });

        assertMarvelTemplate();

        logger.info("--> removing the marvel template");
        assertAcked(client().admin().indices().prepareDeleteTemplate("marvel").get());

        logger.info("--> shutting down node0");
        cluster().stopRandomNode(new Predicate<Settings>() {
            @Override
            public boolean apply(Settings settings) {
                return settings.get("name").equals(node0);
            }
        });

        logger.info("--> exporting events from node1");
        // we use assert busy node because url caching may cause the node failure to be only detected while sending the event
        assertTrue("failed to find a template named 'marvel'", awaitBusy(new Predicate<Object>() {
            @Override
            public boolean apply(Object o) {
                esExporter1.exportEvents(new Event[]{
                        new TestEvent()
                });
                logger.debug("--> checking for template");
                return findMarvelTemplate();
            }
        }));
    }

    private ESExporter getEsExporter() {
        AgentService service = cluster().getInstance(AgentService.class);
        return (ESExporter) service.getExporters().iterator().next();
    }

    private ESExporter getEsExporter(String node) {
        AgentService service = cluster().getInstance(AgentService.class, node);
        return (ESExporter) service.getExporters().iterator().next();
    }

    final static AtomicLong timeStampGenerator = new AtomicLong();

    class TestEvent extends Event {

        public TestEvent() {
            super(timeStampGenerator.incrementAndGet(), "test_cluster");
        }

        @Override
        public String type() {
            return "test_event";
        }

        @Override
        public String conciseDescription() {
            return "test_event";
        }
    }
}
