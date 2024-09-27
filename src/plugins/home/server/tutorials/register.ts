/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { activemqLogsSpecProvider } from './activemq_logs';
import { activemqMetricsSpecProvider } from './activemq_metrics';
import { aerospikeMetricsSpecProvider } from './aerospike_metrics';
import { apacheLogsSpecProvider } from './apache_logs';
import { apacheMetricsSpecProvider } from './apache_metrics';
import { auditbeatSpecProvider } from './auditbeat';
import { auditdLogsSpecProvider } from './auditd_logs';
import { awsLogsSpecProvider } from './aws_logs';
import { awsMetricsSpecProvider } from './aws_metrics';
import { azureLogsSpecProvider } from './azure_logs';
import { azureMetricsSpecProvider } from './azure_metrics';
import { barracudaLogsSpecProvider } from './barracuda_logs';
import { bluecoatLogsSpecProvider } from './bluecoat_logs';
import { cefLogsSpecProvider } from './cef_logs';
import { cephMetricsSpecProvider } from './ceph_metrics';
import { checkpointLogsSpecProvider } from './checkpoint_logs';
import { ciscoLogsSpecProvider } from './cisco_logs';
import { cloudwatchLogsSpecProvider } from './cloudwatch_logs';
import { cockroachdbMetricsSpecProvider } from './cockroachdb_metrics';
import { consulMetricsSpecProvider } from './consul_metrics';
import { corednsLogsSpecProvider } from './coredns_logs';
import { corednsMetricsSpecProvider } from './coredns_metrics';
import { couchbaseMetricsSpecProvider } from './couchbase_metrics';
import { couchdbMetricsSpecProvider } from './couchdb_metrics';
import { crowdstrikeLogsSpecProvider } from './crowdstrike_logs';
import { cylanceLogsSpecProvider } from './cylance_logs';
import { dockerMetricsSpecProvider } from './docker_metrics';
import { dropwizardMetricsSpecProvider } from './dropwizard_metrics';
import { elasticsearchLogsSpecProvider } from './elasticsearch_logs';
import { elasticsearchMetricsSpecProvider } from './elasticsearch_metrics';
import { envoyproxyLogsSpecProvider } from './envoyproxy_logs';
import { envoyproxyMetricsSpecProvider } from './envoyproxy_metrics';
import { etcdMetricsSpecProvider } from './etcd_metrics';
import { f5LogsSpecProvider } from './f5_logs';
import { fortinetLogsSpecProvider } from './fortinet_logs';
import { golangMetricsSpecProvider } from './golang_metrics';
import { gcpLogsSpecProvider } from './gcp_logs';
import { gcpMetricsSpecProvider } from './gcp_metrics';
import { gsuiteLogsSpecProvider } from './gsuite_logs';
import { haproxyLogsSpecProvider } from './haproxy_logs';
import { haproxyMetricsSpecProvider } from './haproxy_metrics';
import { ibmmqLogsSpecProvider } from './ibmmq_logs';
import { ibmmqMetricsSpecProvider } from './ibmmq_metrics';
import { icingaLogsSpecProvider } from './icinga_logs';
import { iisLogsSpecProvider } from './iis_logs';
import { iisMetricsSpecProvider } from './iis_metrics';
import { impervaLogsSpecProvider } from './imperva_logs';
import { infobloxLogsSpecProvider } from './infoblox_logs';
import { iptablesLogsSpecProvider } from './iptables_logs';
import { juniperLogsSpecProvider } from './juniper_logs';
import { kafkaLogsSpecProvider } from './kafka_logs';
import { kafkaMetricsSpecProvider } from './kafka_metrics';
import { kibanaLogsSpecProvider } from './kibana_logs';
import { kibanaMetricsSpecProvider } from './kibana_metrics';
import { kubernetesMetricsSpecProvider } from './kubernetes_metrics';
import { logstashLogsSpecProvider } from './logstash_logs';
import { logstashMetricsSpecProvider } from './logstash_metrics';
import { memcachedMetricsSpecProvider } from './memcached_metrics';
import { microsoftLogsSpecProvider } from './microsoft_logs';
import { mispLogsSpecProvider } from './misp_logs';
import { mongodbLogsSpecProvider } from './mongodb_logs';
import { mongodbMetricsSpecProvider } from './mongodb_metrics';
import { mssqlLogsSpecProvider } from './mssql_logs';
import { mssqlMetricsSpecProvider } from './mssql_metrics';
import { muninMetricsSpecProvider } from './munin_metrics';
import { mysqlLogsSpecProvider } from './mysql_logs';
import { mysqlMetricsSpecProvider } from './mysql_metrics';
import { natsLogsSpecProvider } from './nats_logs';
import { natsMetricsSpecProvider } from './nats_metrics';
import { netflowLogsSpecProvider } from './netflow_logs';
import { netscoutLogsSpecProvider } from './netscout_logs';
import { nginxLogsSpecProvider } from './nginx_logs';
import { nginxMetricsSpecProvider } from './nginx_metrics';
import { o365LogsSpecProvider } from './o365_logs';
import { oktaLogsSpecProvider } from './okta_logs';
import { openmetricsMetricsSpecProvider } from './openmetrics_metrics';
import { oracleMetricsSpecProvider } from './oracle_metrics';
import { osqueryLogsSpecProvider } from './osquery_logs';
import { panwLogsSpecProvider } from './panw_logs';
import { phpfpmMetricsSpecProvider } from './php_fpm_metrics';
import { postgresqlLogsSpecProvider } from './postgresql_logs';
import { postgresqlMetricsSpecProvider } from './postgresql_metrics';
import { prometheusMetricsSpecProvider } from './prometheus_metrics';
import { rabbitmqLogsSpecProvider } from './rabbitmq_logs';
import { rabbitmqMetricsSpecProvider } from './rabbitmq_metrics';
import { radwareLogsSpecProvider } from './radware_logs';
import { redisLogsSpecProvider } from './redis_logs';
import { redisMetricsSpecProvider } from './redis_metrics';
import { redisenterpriseMetricsSpecProvider } from './redisenterprise_metrics';
import { santaLogsSpecProvider } from './santa_logs';
import { sonicwallLogsSpecProvider } from './sonicwall_logs';
import { sophosLogsSpecProvider } from './sophos_logs';
import { stanMetricsSpecProvider } from './stan_metrics';
import { statsdMetricsSpecProvider } from './statsd_metrics';
import { suricataLogsSpecProvider } from './suricata_logs';
import { systemLogsSpecProvider } from './system_logs';
import { systemMetricsSpecProvider } from './system_metrics';
import { tomcatLogsSpecProvider } from './tomcat_logs';
import { traefikLogsSpecProvider } from './traefik_logs';
import { traefikMetricsSpecProvider } from './traefik_metrics';
import { uptimeMonitorsSpecProvider } from './uptime_monitors';
import { uwsgiMetricsSpecProvider } from './uwsgi_metrics';
import { vSphereMetricsSpecProvider } from './vsphere_metrics';
import { windowsEventLogsSpecProvider } from './windows_event_logs';
import { windowsMetricsSpecProvider } from './windows_metrics';
import { zeekLogsSpecProvider } from './zeek_logs';
import { zookeeperMetricsSpecProvider } from './zookeeper_metrics';
import { zscalerLogsSpecProvider } from './zscaler_logs';

export const builtInTutorials = [
  systemLogsSpecProvider,
  systemMetricsSpecProvider,
  apacheLogsSpecProvider,
  apacheMetricsSpecProvider,
  elasticsearchLogsSpecProvider,
  iisLogsSpecProvider,
  kafkaLogsSpecProvider,
  logstashLogsSpecProvider,
  nginxLogsSpecProvider,
  nginxMetricsSpecProvider,
  mysqlLogsSpecProvider,
  mysqlMetricsSpecProvider,
  mongodbMetricsSpecProvider,
  osqueryLogsSpecProvider,
  phpfpmMetricsSpecProvider,
  postgresqlMetricsSpecProvider,
  postgresqlLogsSpecProvider,
  rabbitmqMetricsSpecProvider,
  redisLogsSpecProvider,
  redisMetricsSpecProvider,
  suricataLogsSpecProvider,
  dockerMetricsSpecProvider,
  kubernetesMetricsSpecProvider,
  uwsgiMetricsSpecProvider,
  netflowLogsSpecProvider,
  traefikLogsSpecProvider,
  cephMetricsSpecProvider,
  aerospikeMetricsSpecProvider,
  couchbaseMetricsSpecProvider,
  dropwizardMetricsSpecProvider,
  elasticsearchMetricsSpecProvider,
  etcdMetricsSpecProvider,
  haproxyMetricsSpecProvider,
  kafkaMetricsSpecProvider,
  kibanaMetricsSpecProvider,
  memcachedMetricsSpecProvider,
  muninMetricsSpecProvider,
  vSphereMetricsSpecProvider,
  windowsMetricsSpecProvider,
  windowsEventLogsSpecProvider,
  golangMetricsSpecProvider,
  logstashMetricsSpecProvider,
  prometheusMetricsSpecProvider,
  zookeeperMetricsSpecProvider,
  uptimeMonitorsSpecProvider,
  cloudwatchLogsSpecProvider,
  awsMetricsSpecProvider,
  mssqlMetricsSpecProvider,
  natsMetricsSpecProvider,
  natsLogsSpecProvider,
  zeekLogsSpecProvider,
  corednsMetricsSpecProvider,
  corednsLogsSpecProvider,
  auditbeatSpecProvider,
  iptablesLogsSpecProvider,
  ciscoLogsSpecProvider,
  envoyproxyLogsSpecProvider,
  couchdbMetricsSpecProvider,
  consulMetricsSpecProvider,
  cockroachdbMetricsSpecProvider,
  traefikMetricsSpecProvider,
  awsLogsSpecProvider,
  activemqLogsSpecProvider,
  activemqMetricsSpecProvider,
  azureMetricsSpecProvider,
  ibmmqLogsSpecProvider,
  ibmmqMetricsSpecProvider,
  stanMetricsSpecProvider,
  envoyproxyMetricsSpecProvider,
  statsdMetricsSpecProvider,
  redisenterpriseMetricsSpecProvider,
  openmetricsMetricsSpecProvider,
  oracleMetricsSpecProvider,
  iisMetricsSpecProvider,
  azureLogsSpecProvider,
  gcpMetricsSpecProvider,
  auditdLogsSpecProvider,
  barracudaLogsSpecProvider,
  bluecoatLogsSpecProvider,
  cefLogsSpecProvider,
  checkpointLogsSpecProvider,
  crowdstrikeLogsSpecProvider,
  cylanceLogsSpecProvider,
  f5LogsSpecProvider,
  fortinetLogsSpecProvider,
  gcpLogsSpecProvider,
  gsuiteLogsSpecProvider,
  haproxyLogsSpecProvider,
  icingaLogsSpecProvider,
  impervaLogsSpecProvider,
  infobloxLogsSpecProvider,
  juniperLogsSpecProvider,
  kibanaLogsSpecProvider,
  microsoftLogsSpecProvider,
  mispLogsSpecProvider,
  mongodbLogsSpecProvider,
  mssqlLogsSpecProvider,
  netscoutLogsSpecProvider,
  o365LogsSpecProvider,
  oktaLogsSpecProvider,
  panwLogsSpecProvider,
  rabbitmqLogsSpecProvider,
  radwareLogsSpecProvider,
  santaLogsSpecProvider,
  sonicwallLogsSpecProvider,
  sophosLogsSpecProvider,
  tomcatLogsSpecProvider,
  zscalerLogsSpecProvider,
];
