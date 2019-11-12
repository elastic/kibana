/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
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
import { systemLogsSpecProvider } from './system_logs';
import { systemMetricsSpecProvider } from './system_metrics';
import { apacheLogsSpecProvider } from './apache_logs';
import { apacheMetricsSpecProvider } from './apache_metrics';
import { elasticsearchLogsSpecProvider } from './elasticsearch_logs';
import { iisLogsSpecProvider } from './iis_logs';
import { kafkaLogsSpecProvider } from './kafka_logs';
import { logstashLogsSpecProvider } from './logstash_logs';
import { nginxLogsSpecProvider } from './nginx_logs';
import { nginxMetricsSpecProvider } from './nginx_metrics';
import { mysqlLogsSpecProvider } from './mysql_logs';
import { mysqlMetricsSpecProvider } from './mysql_metrics';
import { mongodbMetricsSpecProvider } from './mongodb_metrics';
import { osqueryLogsSpecProvider } from './osquery_logs';
import { phpfpmMetricsSpecProvider } from './php_fpm_metrics';
import { postgresqlMetricsSpecProvider } from './postgresql_metrics';
import { postgresqlLogsSpecProvider } from './postgresql_logs';
import { rabbitmqMetricsSpecProvider } from './rabbitmq_metrics';
import { redisLogsSpecProvider } from './redis_logs';
import { redisMetricsSpecProvider } from './redis_metrics';
import { suricataLogsSpecProvider } from './suricata_logs';
import { dockerMetricsSpecProvider } from './docker_metrics';
import { kubernetesMetricsSpecProvider } from './kubernetes_metrics';
import { uwsgiMetricsSpecProvider } from './uwsgi_metrics';
import { netflowSpecProvider } from './netflow';
import { traefikLogsSpecProvider } from './traefik_logs';
import { apmSpecProvider } from './apm';
import { cephMetricsSpecProvider } from './ceph_metrics';
import { aerospikeMetricsSpecProvider } from './aerospike_metrics';
import { couchbaseMetricsSpecProvider } from './couchbase_metrics';
import { dropwizardMetricsSpecProvider } from './dropwizard_metrics';
import { elasticsearchMetricsSpecProvider } from './elasticsearch_metrics';
import { etcdMetricsSpecProvider } from './etcd_metrics';
import { haproxyMetricsSpecProvider } from './haproxy_metrics';
import { kafkaMetricsSpecProvider } from './kafka_metrics';
import { kibanaMetricsSpecProvider } from './kibana_metrics';
import { memcachedMetricsSpecProvider } from './memcached_metrics';
import { muninMetricsSpecProvider } from './munin_metrics';
import { vSphereMetricsSpecProvider } from './vsphere_metrics';
import { windowsMetricsSpecProvider } from './windows_metrics';
import { windowsEventLogsSpecProvider } from './windows_event_logs';
import { golangMetricsSpecProvider } from './golang_metrics';
import { logstashMetricsSpecProvider } from './logstash_metrics';
import { prometheusMetricsSpecProvider } from './prometheus_metrics';
import { zookeeperMetricsSpecProvider } from './zookeeper_metrics';
import { uptimeMonitorsSpecProvider } from './uptime_monitors';
import { cloudwatchLogsSpecProvider } from './cloudwatch_logs';
import { awsMetricsSpecProvider } from './aws_metrics';
import { mssqlMetricsSpecProvider } from './mssql_metrics';
import { natsMetricsSpecProvider } from './nats_metrics';
import { natsLogsSpecProvider } from './nats_logs';
import { zeekLogsSpecProvider } from './zeek_logs';
import { corednsMetricsSpecProvider } from './coredns_metrics';
import { corednsLogsSpecProvider } from './coredns_logs';
import { auditbeatSpecProvider } from './auditbeat';
import { iptablesLogsSpecProvider } from './iptables_logs';
import { ciscoLogsSpecProvider } from './cisco_logs';
import { envoyproxyLogsSpecProvider } from './envoyproxy_logs';
import { couchdbMetricsSpecProvider } from './couchdb_metrics';
import { emsBoundariesSpecProvider } from './ems';
import { consulMetricsSpecProvider } from './consul_metrics';
import { cockroachdbMetricsSpecProvider } from './cockroachdb_metrics';

export function registerTutorials(server) {
  server.newPlatform.setup.plugins.tutorials.registerTutorial(systemLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(systemMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(apacheLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(apacheMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(elasticsearchLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(iisLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(kafkaLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(logstashLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(nginxLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(nginxMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(mysqlLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(mysqlMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(mongodbMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(osqueryLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(phpfpmMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(postgresqlMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(postgresqlLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(rabbitmqMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(redisLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(redisMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(suricataLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(dockerMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(kubernetesMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(uwsgiMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(netflowSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(traefikLogsSpecProvider);
  server.registerTutorial(apmSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(cephMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(aerospikeMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(couchbaseMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(dropwizardMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(elasticsearchMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(etcdMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(haproxyMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(kafkaMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(kibanaMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(memcachedMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(muninMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(vSphereMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(windowsMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(windowsEventLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(golangMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(logstashMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(prometheusMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(zookeeperMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(uptimeMonitorsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(cloudwatchLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(awsMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(mssqlMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(natsMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(natsLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(zeekLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(corednsMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(corednsLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(auditbeatSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(iptablesLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(ciscoLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(envoyproxyLogsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(couchdbMetricsSpecProvider);
  server.registerTutorial(emsBoundariesSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(consulMetricsSpecProvider);
  server.newPlatform.setup.plugins.tutorials.registerTutorial(cockroachdbMetricsSpecProvider);
}
