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
import { golangMetricsSpecProvider } from './golang_metrics';
import { logstashMetricsSpecProvider } from './logstash_metrics';
import { prometheusMetricsSpecProvider } from './prometheus_metrics';
import { zookeeperMetricsSpecProvider } from './zookeeper_metrics';
import { uptimeMonitorsSpecProvider } from './uptime_monitors';
import { cloudwatchLogsSpecProvider } from './cloudwatch_logs';
import { awsMetricsSpecProvider } from './aws_metrics';
import { mssqlMetricsSpecProvider } from './mssql_metrics';
import { zeekLogsSpecProvider } from './zeek_logs';
import { natsLogsSpecProvider } from './nats_logs';

export function registerTutorials(server) {
  server.registerTutorial(systemLogsSpecProvider);
  server.registerTutorial(systemMetricsSpecProvider);
  server.registerTutorial(apacheLogsSpecProvider);
  server.registerTutorial(apacheMetricsSpecProvider);
  server.registerTutorial(elasticsearchLogsSpecProvider);
  server.registerTutorial(iisLogsSpecProvider);
  server.registerTutorial(kafkaLogsSpecProvider);
  server.registerTutorial(logstashLogsSpecProvider);
  server.registerTutorial(nginxLogsSpecProvider);
  server.registerTutorial(nginxMetricsSpecProvider);
  server.registerTutorial(mysqlLogsSpecProvider);
  server.registerTutorial(mysqlMetricsSpecProvider);
  server.registerTutorial(mongodbMetricsSpecProvider);
  server.registerTutorial(osqueryLogsSpecProvider);
  server.registerTutorial(phpfpmMetricsSpecProvider);
  server.registerTutorial(postgresqlMetricsSpecProvider);
  server.registerTutorial(postgresqlLogsSpecProvider);
  server.registerTutorial(rabbitmqMetricsSpecProvider);
  server.registerTutorial(redisLogsSpecProvider);
  server.registerTutorial(redisMetricsSpecProvider);
  server.registerTutorial(suricataLogsSpecProvider);
  server.registerTutorial(dockerMetricsSpecProvider);
  server.registerTutorial(kubernetesMetricsSpecProvider);
  server.registerTutorial(uwsgiMetricsSpecProvider);
  server.registerTutorial(netflowSpecProvider);
  server.registerTutorial(traefikLogsSpecProvider);
  server.registerTutorial(apmSpecProvider);
  server.registerTutorial(cephMetricsSpecProvider);
  server.registerTutorial(aerospikeMetricsSpecProvider);
  server.registerTutorial(couchbaseMetricsSpecProvider);
  server.registerTutorial(dropwizardMetricsSpecProvider);
  server.registerTutorial(elasticsearchMetricsSpecProvider);
  server.registerTutorial(etcdMetricsSpecProvider);
  server.registerTutorial(haproxyMetricsSpecProvider);
  server.registerTutorial(kafkaMetricsSpecProvider);
  server.registerTutorial(kibanaMetricsSpecProvider);
  server.registerTutorial(memcachedMetricsSpecProvider);
  server.registerTutorial(muninMetricsSpecProvider);
  server.registerTutorial(vSphereMetricsSpecProvider);
  server.registerTutorial(windowsMetricsSpecProvider);
  server.registerTutorial(golangMetricsSpecProvider);
  server.registerTutorial(logstashMetricsSpecProvider);
  server.registerTutorial(prometheusMetricsSpecProvider);
  server.registerTutorial(zookeeperMetricsSpecProvider);
  server.registerTutorial(uptimeMonitorsSpecProvider);
  server.registerTutorial(cloudwatchLogsSpecProvider);
  server.registerTutorial(awsMetricsSpecProvider);
  server.registerTutorial(mssqlMetricsSpecProvider);
  server.registerTutorial(zeekLogsSpecProvider);
  server.registerTutorial(natsLogsSpecProvider);
}
