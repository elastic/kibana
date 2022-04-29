/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.builtInTutorials = void 0;

const _activemq_logs = require('./activemq_logs');

const _activemq_metrics = require('./activemq_metrics');

const _aerospike_metrics = require('./aerospike_metrics');

const _apache_logs = require('./apache_logs');

const _apache_metrics = require('./apache_metrics');

const _auditbeat = require('./auditbeat');

const _auditd_logs = require('./auditd_logs');

const _aws_logs = require('./aws_logs');

const _aws_metrics = require('./aws_metrics');

const _azure_logs = require('./azure_logs');

const _azure_metrics = require('./azure_metrics');

const _barracuda_logs = require('./barracuda_logs');

const _bluecoat_logs = require('./bluecoat_logs');

const _cef_logs = require('./cef_logs');

const _ceph_metrics = require('./ceph_metrics');

const _checkpoint_logs = require('./checkpoint_logs');

const _cisco_logs = require('./cisco_logs');

const _cloudwatch_logs = require('./cloudwatch_logs');

const _cockroachdb_metrics = require('./cockroachdb_metrics');

const _consul_metrics = require('./consul_metrics');

const _coredns_logs = require('./coredns_logs');

const _coredns_metrics = require('./coredns_metrics');

const _couchbase_metrics = require('./couchbase_metrics');

const _couchdb_metrics = require('./couchdb_metrics');

const _crowdstrike_logs = require('./crowdstrike_logs');

const _cylance_logs = require('./cylance_logs');

const _docker_metrics = require('./docker_metrics');

const _dropwizard_metrics = require('./dropwizard_metrics');

const _elasticsearch_logs = require('./elasticsearch_logs');

const _elasticsearch_metrics = require('./elasticsearch_metrics');

const _envoyproxy_logs = require('./envoyproxy_logs');

const _envoyproxy_metrics = require('./envoyproxy_metrics');

const _etcd_metrics = require('./etcd_metrics');

const _f5_logs = require('./f5_logs');

const _fortinet_logs = require('./fortinet_logs');

const _golang_metrics = require('./golang_metrics');

const _gcp_logs = require('./gcp_logs');

const _gcp_metrics = require('./gcp_metrics');

const _gsuite_logs = require('./gsuite_logs');

const _haproxy_logs = require('./haproxy_logs');

const _haproxy_metrics = require('./haproxy_metrics');

const _ibmmq_logs = require('./ibmmq_logs');

const _ibmmq_metrics = require('./ibmmq_metrics');

const _icinga_logs = require('./icinga_logs');

const _iis_logs = require('./iis_logs');

const _iis_metrics = require('./iis_metrics');

const _imperva_logs = require('./imperva_logs');

const _infoblox_logs = require('./infoblox_logs');

const _iptables_logs = require('./iptables_logs');

const _juniper_logs = require('./juniper_logs');

const _kafka_logs = require('./kafka_logs');

const _kafka_metrics = require('./kafka_metrics');

const _kibana_logs = require('./kibana_logs');

const _kibana_metrics = require('./kibana_metrics');

const _kubernetes_metrics = require('./kubernetes_metrics');

const _logstash_logs = require('./logstash_logs');

const _logstash_metrics = require('./logstash_metrics');

const _memcached_metrics = require('./memcached_metrics');

const _microsoft_logs = require('./microsoft_logs');

const _misp_logs = require('./misp_logs');

const _mongodb_logs = require('./mongodb_logs');

const _mongodb_metrics = require('./mongodb_metrics');

const _mssql_logs = require('./mssql_logs');

const _mssql_metrics = require('./mssql_metrics');

const _munin_metrics = require('./munin_metrics');

const _mysql_logs = require('./mysql_logs');

const _mysql_metrics = require('./mysql_metrics');

const _nats_logs = require('./nats_logs');

const _nats_metrics = require('./nats_metrics');

const _netflow_logs = require('./netflow_logs');

const _netscout_logs = require('./netscout_logs');

const _nginx_logs = require('./nginx_logs');

const _nginx_metrics = require('./nginx_metrics');

const _o365_logs = require('./o365_logs');

const _okta_logs = require('./okta_logs');

const _openmetrics_metrics = require('./openmetrics_metrics');

const _oracle_metrics = require('./oracle_metrics');

const _osquery_logs = require('./osquery_logs');

const _panw_logs = require('./panw_logs');

const _php_fpm_metrics = require('./php_fpm_metrics');

const _postgresql_logs = require('./postgresql_logs');

const _postgresql_metrics = require('./postgresql_metrics');

const _prometheus_metrics = require('./prometheus_metrics');

const _rabbitmq_logs = require('./rabbitmq_logs');

const _rabbitmq_metrics = require('./rabbitmq_metrics');

const _radware_logs = require('./radware_logs');

const _redis_logs = require('./redis_logs');

const _redis_metrics = require('./redis_metrics');

const _redisenterprise_metrics = require('./redisenterprise_metrics');

const _santa_logs = require('./santa_logs');

const _sonicwall_logs = require('./sonicwall_logs');

const _sophos_logs = require('./sophos_logs');

const _squid_logs = require('./squid_logs');

const _stan_metrics = require('./stan_metrics');

const _statsd_metrics = require('./statsd_metrics');

const _suricata_logs = require('./suricata_logs');

const _system_logs = require('./system_logs');

const _system_metrics = require('./system_metrics');

const _tomcat_logs = require('./tomcat_logs');

const _traefik_logs = require('./traefik_logs');

const _traefik_metrics = require('./traefik_metrics');

const _uptime_monitors = require('./uptime_monitors');

const _uwsgi_metrics = require('./uwsgi_metrics');

const _vsphere_metrics = require('./vsphere_metrics');

const _windows_event_logs = require('./windows_event_logs');

const _windows_metrics = require('./windows_metrics');

const _zeek_logs = require('./zeek_logs');

const _zookeeper_metrics = require('./zookeeper_metrics');

const _zscaler_logs = require('./zscaler_logs');

const builtInTutorials = [
  _system_logs.systemLogsSpecProvider,
  _system_metrics.systemMetricsSpecProvider,
  _apache_logs.apacheLogsSpecProvider,
  _apache_metrics.apacheMetricsSpecProvider,
  _elasticsearch_logs.elasticsearchLogsSpecProvider,
  _iis_logs.iisLogsSpecProvider,
  _kafka_logs.kafkaLogsSpecProvider,
  _logstash_logs.logstashLogsSpecProvider,
  _nginx_logs.nginxLogsSpecProvider,
  _nginx_metrics.nginxMetricsSpecProvider,
  _mysql_logs.mysqlLogsSpecProvider,
  _mysql_metrics.mysqlMetricsSpecProvider,
  _mongodb_metrics.mongodbMetricsSpecProvider,
  _osquery_logs.osqueryLogsSpecProvider,
  _php_fpm_metrics.phpfpmMetricsSpecProvider,
  _postgresql_metrics.postgresqlMetricsSpecProvider,
  _postgresql_logs.postgresqlLogsSpecProvider,
  _rabbitmq_metrics.rabbitmqMetricsSpecProvider,
  _redis_logs.redisLogsSpecProvider,
  _redis_metrics.redisMetricsSpecProvider,
  _suricata_logs.suricataLogsSpecProvider,
  _docker_metrics.dockerMetricsSpecProvider,
  _kubernetes_metrics.kubernetesMetricsSpecProvider,
  _uwsgi_metrics.uwsgiMetricsSpecProvider,
  _netflow_logs.netflowLogsSpecProvider,
  _traefik_logs.traefikLogsSpecProvider,
  _ceph_metrics.cephMetricsSpecProvider,
  _aerospike_metrics.aerospikeMetricsSpecProvider,
  _couchbase_metrics.couchbaseMetricsSpecProvider,
  _dropwizard_metrics.dropwizardMetricsSpecProvider,
  _elasticsearch_metrics.elasticsearchMetricsSpecProvider,
  _etcd_metrics.etcdMetricsSpecProvider,
  _haproxy_metrics.haproxyMetricsSpecProvider,
  _kafka_metrics.kafkaMetricsSpecProvider,
  _kibana_metrics.kibanaMetricsSpecProvider,
  _memcached_metrics.memcachedMetricsSpecProvider,
  _munin_metrics.muninMetricsSpecProvider,
  _vsphere_metrics.vSphereMetricsSpecProvider,
  _windows_metrics.windowsMetricsSpecProvider,
  _windows_event_logs.windowsEventLogsSpecProvider,
  _golang_metrics.golangMetricsSpecProvider,
  _logstash_metrics.logstashMetricsSpecProvider,
  _prometheus_metrics.prometheusMetricsSpecProvider,
  _zookeeper_metrics.zookeeperMetricsSpecProvider,
  _uptime_monitors.uptimeMonitorsSpecProvider,
  _cloudwatch_logs.cloudwatchLogsSpecProvider,
  _aws_metrics.awsMetricsSpecProvider,
  _mssql_metrics.mssqlMetricsSpecProvider,
  _nats_metrics.natsMetricsSpecProvider,
  _nats_logs.natsLogsSpecProvider,
  _zeek_logs.zeekLogsSpecProvider,
  _coredns_metrics.corednsMetricsSpecProvider,
  _coredns_logs.corednsLogsSpecProvider,
  _auditbeat.auditbeatSpecProvider,
  _iptables_logs.iptablesLogsSpecProvider,
  _cisco_logs.ciscoLogsSpecProvider,
  _envoyproxy_logs.envoyproxyLogsSpecProvider,
  _couchdb_metrics.couchdbMetricsSpecProvider,
  _consul_metrics.consulMetricsSpecProvider,
  _cockroachdb_metrics.cockroachdbMetricsSpecProvider,
  _traefik_metrics.traefikMetricsSpecProvider,
  _aws_logs.awsLogsSpecProvider,
  _activemq_logs.activemqLogsSpecProvider,
  _activemq_metrics.activemqMetricsSpecProvider,
  _azure_metrics.azureMetricsSpecProvider,
  _ibmmq_logs.ibmmqLogsSpecProvider,
  _ibmmq_metrics.ibmmqMetricsSpecProvider,
  _stan_metrics.stanMetricsSpecProvider,
  _envoyproxy_metrics.envoyproxyMetricsSpecProvider,
  _statsd_metrics.statsdMetricsSpecProvider,
  _redisenterprise_metrics.redisenterpriseMetricsSpecProvider,
  _openmetrics_metrics.openmetricsMetricsSpecProvider,
  _oracle_metrics.oracleMetricsSpecProvider,
  _iis_metrics.iisMetricsSpecProvider,
  _azure_logs.azureLogsSpecProvider,
  _gcp_metrics.gcpMetricsSpecProvider,
  _auditd_logs.auditdLogsSpecProvider,
  _barracuda_logs.barracudaLogsSpecProvider,
  _bluecoat_logs.bluecoatLogsSpecProvider,
  _cef_logs.cefLogsSpecProvider,
  _checkpoint_logs.checkpointLogsSpecProvider,
  _crowdstrike_logs.crowdstrikeLogsSpecProvider,
  _cylance_logs.cylanceLogsSpecProvider,
  _f5_logs.f5LogsSpecProvider,
  _fortinet_logs.fortinetLogsSpecProvider,
  _gcp_logs.gcpLogsSpecProvider,
  _gsuite_logs.gsuiteLogsSpecProvider,
  _haproxy_logs.haproxyLogsSpecProvider,
  _icinga_logs.icingaLogsSpecProvider,
  _imperva_logs.impervaLogsSpecProvider,
  _infoblox_logs.infobloxLogsSpecProvider,
  _juniper_logs.juniperLogsSpecProvider,
  _kibana_logs.kibanaLogsSpecProvider,
  _microsoft_logs.microsoftLogsSpecProvider,
  _misp_logs.mispLogsSpecProvider,
  _mongodb_logs.mongodbLogsSpecProvider,
  _mssql_logs.mssqlLogsSpecProvider,
  _netscout_logs.netscoutLogsSpecProvider,
  _o365_logs.o365LogsSpecProvider,
  _okta_logs.oktaLogsSpecProvider,
  _panw_logs.panwLogsSpecProvider,
  _rabbitmq_logs.rabbitmqLogsSpecProvider,
  _radware_logs.radwareLogsSpecProvider,
  _santa_logs.santaLogsSpecProvider,
  _sonicwall_logs.sonicwallLogsSpecProvider,
  _sophos_logs.sophosLogsSpecProvider,
  _squid_logs.squidLogsSpecProvider,
  _tomcat_logs.tomcatLogsSpecProvider,
  _zscaler_logs.zscalerLogsSpecProvider,
];
exports.builtInTutorials = builtInTutorials;
