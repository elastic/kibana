"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.builtInTutorials = void 0;

var _activemq_logs = require("./activemq_logs");

var _activemq_metrics = require("./activemq_metrics");

var _aerospike_metrics = require("./aerospike_metrics");

var _apache_logs = require("./apache_logs");

var _apache_metrics = require("./apache_metrics");

var _auditbeat = require("./auditbeat");

var _auditd_logs = require("./auditd_logs");

var _aws_logs = require("./aws_logs");

var _aws_metrics = require("./aws_metrics");

var _azure_logs = require("./azure_logs");

var _azure_metrics = require("./azure_metrics");

var _barracuda_logs = require("./barracuda_logs");

var _bluecoat_logs = require("./bluecoat_logs");

var _cef_logs = require("./cef_logs");

var _ceph_metrics = require("./ceph_metrics");

var _checkpoint_logs = require("./checkpoint_logs");

var _cisco_logs = require("./cisco_logs");

var _cloudwatch_logs = require("./cloudwatch_logs");

var _cockroachdb_metrics = require("./cockroachdb_metrics");

var _consul_metrics = require("./consul_metrics");

var _coredns_logs = require("./coredns_logs");

var _coredns_metrics = require("./coredns_metrics");

var _couchbase_metrics = require("./couchbase_metrics");

var _couchdb_metrics = require("./couchdb_metrics");

var _crowdstrike_logs = require("./crowdstrike_logs");

var _cylance_logs = require("./cylance_logs");

var _docker_metrics = require("./docker_metrics");

var _dropwizard_metrics = require("./dropwizard_metrics");

var _elasticsearch_logs = require("./elasticsearch_logs");

var _elasticsearch_metrics = require("./elasticsearch_metrics");

var _envoyproxy_logs = require("./envoyproxy_logs");

var _envoyproxy_metrics = require("./envoyproxy_metrics");

var _etcd_metrics = require("./etcd_metrics");

var _f5_logs = require("./f5_logs");

var _fortinet_logs = require("./fortinet_logs");

var _golang_metrics = require("./golang_metrics");

var _gcp_logs = require("./gcp_logs");

var _gcp_metrics = require("./gcp_metrics");

var _gsuite_logs = require("./gsuite_logs");

var _haproxy_logs = require("./haproxy_logs");

var _haproxy_metrics = require("./haproxy_metrics");

var _ibmmq_logs = require("./ibmmq_logs");

var _ibmmq_metrics = require("./ibmmq_metrics");

var _icinga_logs = require("./icinga_logs");

var _iis_logs = require("./iis_logs");

var _iis_metrics = require("./iis_metrics");

var _imperva_logs = require("./imperva_logs");

var _infoblox_logs = require("./infoblox_logs");

var _iptables_logs = require("./iptables_logs");

var _juniper_logs = require("./juniper_logs");

var _kafka_logs = require("./kafka_logs");

var _kafka_metrics = require("./kafka_metrics");

var _kibana_logs = require("./kibana_logs");

var _kibana_metrics = require("./kibana_metrics");

var _kubernetes_metrics = require("./kubernetes_metrics");

var _logstash_logs = require("./logstash_logs");

var _logstash_metrics = require("./logstash_metrics");

var _memcached_metrics = require("./memcached_metrics");

var _microsoft_logs = require("./microsoft_logs");

var _misp_logs = require("./misp_logs");

var _mongodb_logs = require("./mongodb_logs");

var _mongodb_metrics = require("./mongodb_metrics");

var _mssql_logs = require("./mssql_logs");

var _mssql_metrics = require("./mssql_metrics");

var _munin_metrics = require("./munin_metrics");

var _mysql_logs = require("./mysql_logs");

var _mysql_metrics = require("./mysql_metrics");

var _nats_logs = require("./nats_logs");

var _nats_metrics = require("./nats_metrics");

var _netflow_logs = require("./netflow_logs");

var _netscout_logs = require("./netscout_logs");

var _nginx_logs = require("./nginx_logs");

var _nginx_metrics = require("./nginx_metrics");

var _o365_logs = require("./o365_logs");

var _okta_logs = require("./okta_logs");

var _openmetrics_metrics = require("./openmetrics_metrics");

var _oracle_metrics = require("./oracle_metrics");

var _osquery_logs = require("./osquery_logs");

var _panw_logs = require("./panw_logs");

var _php_fpm_metrics = require("./php_fpm_metrics");

var _postgresql_logs = require("./postgresql_logs");

var _postgresql_metrics = require("./postgresql_metrics");

var _prometheus_metrics = require("./prometheus_metrics");

var _rabbitmq_logs = require("./rabbitmq_logs");

var _rabbitmq_metrics = require("./rabbitmq_metrics");

var _radware_logs = require("./radware_logs");

var _redis_logs = require("./redis_logs");

var _redis_metrics = require("./redis_metrics");

var _redisenterprise_metrics = require("./redisenterprise_metrics");

var _santa_logs = require("./santa_logs");

var _sonicwall_logs = require("./sonicwall_logs");

var _sophos_logs = require("./sophos_logs");

var _squid_logs = require("./squid_logs");

var _stan_metrics = require("./stan_metrics");

var _statsd_metrics = require("./statsd_metrics");

var _suricata_logs = require("./suricata_logs");

var _system_logs = require("./system_logs");

var _system_metrics = require("./system_metrics");

var _tomcat_logs = require("./tomcat_logs");

var _traefik_logs = require("./traefik_logs");

var _traefik_metrics = require("./traefik_metrics");

var _uptime_monitors = require("./uptime_monitors");

var _uwsgi_metrics = require("./uwsgi_metrics");

var _vsphere_metrics = require("./vsphere_metrics");

var _windows_event_logs = require("./windows_event_logs");

var _windows_metrics = require("./windows_metrics");

var _zeek_logs = require("./zeek_logs");

var _zookeeper_metrics = require("./zookeeper_metrics");

var _zscaler_logs = require("./zscaler_logs");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const builtInTutorials = [_system_logs.systemLogsSpecProvider, _system_metrics.systemMetricsSpecProvider, _apache_logs.apacheLogsSpecProvider, _apache_metrics.apacheMetricsSpecProvider, _elasticsearch_logs.elasticsearchLogsSpecProvider, _iis_logs.iisLogsSpecProvider, _kafka_logs.kafkaLogsSpecProvider, _logstash_logs.logstashLogsSpecProvider, _nginx_logs.nginxLogsSpecProvider, _nginx_metrics.nginxMetricsSpecProvider, _mysql_logs.mysqlLogsSpecProvider, _mysql_metrics.mysqlMetricsSpecProvider, _mongodb_metrics.mongodbMetricsSpecProvider, _osquery_logs.osqueryLogsSpecProvider, _php_fpm_metrics.phpfpmMetricsSpecProvider, _postgresql_metrics.postgresqlMetricsSpecProvider, _postgresql_logs.postgresqlLogsSpecProvider, _rabbitmq_metrics.rabbitmqMetricsSpecProvider, _redis_logs.redisLogsSpecProvider, _redis_metrics.redisMetricsSpecProvider, _suricata_logs.suricataLogsSpecProvider, _docker_metrics.dockerMetricsSpecProvider, _kubernetes_metrics.kubernetesMetricsSpecProvider, _uwsgi_metrics.uwsgiMetricsSpecProvider, _netflow_logs.netflowLogsSpecProvider, _traefik_logs.traefikLogsSpecProvider, _ceph_metrics.cephMetricsSpecProvider, _aerospike_metrics.aerospikeMetricsSpecProvider, _couchbase_metrics.couchbaseMetricsSpecProvider, _dropwizard_metrics.dropwizardMetricsSpecProvider, _elasticsearch_metrics.elasticsearchMetricsSpecProvider, _etcd_metrics.etcdMetricsSpecProvider, _haproxy_metrics.haproxyMetricsSpecProvider, _kafka_metrics.kafkaMetricsSpecProvider, _kibana_metrics.kibanaMetricsSpecProvider, _memcached_metrics.memcachedMetricsSpecProvider, _munin_metrics.muninMetricsSpecProvider, _vsphere_metrics.vSphereMetricsSpecProvider, _windows_metrics.windowsMetricsSpecProvider, _windows_event_logs.windowsEventLogsSpecProvider, _golang_metrics.golangMetricsSpecProvider, _logstash_metrics.logstashMetricsSpecProvider, _prometheus_metrics.prometheusMetricsSpecProvider, _zookeeper_metrics.zookeeperMetricsSpecProvider, _uptime_monitors.uptimeMonitorsSpecProvider, _cloudwatch_logs.cloudwatchLogsSpecProvider, _aws_metrics.awsMetricsSpecProvider, _mssql_metrics.mssqlMetricsSpecProvider, _nats_metrics.natsMetricsSpecProvider, _nats_logs.natsLogsSpecProvider, _zeek_logs.zeekLogsSpecProvider, _coredns_metrics.corednsMetricsSpecProvider, _coredns_logs.corednsLogsSpecProvider, _auditbeat.auditbeatSpecProvider, _iptables_logs.iptablesLogsSpecProvider, _cisco_logs.ciscoLogsSpecProvider, _envoyproxy_logs.envoyproxyLogsSpecProvider, _couchdb_metrics.couchdbMetricsSpecProvider, _consul_metrics.consulMetricsSpecProvider, _cockroachdb_metrics.cockroachdbMetricsSpecProvider, _traefik_metrics.traefikMetricsSpecProvider, _aws_logs.awsLogsSpecProvider, _activemq_logs.activemqLogsSpecProvider, _activemq_metrics.activemqMetricsSpecProvider, _azure_metrics.azureMetricsSpecProvider, _ibmmq_logs.ibmmqLogsSpecProvider, _ibmmq_metrics.ibmmqMetricsSpecProvider, _stan_metrics.stanMetricsSpecProvider, _envoyproxy_metrics.envoyproxyMetricsSpecProvider, _statsd_metrics.statsdMetricsSpecProvider, _redisenterprise_metrics.redisenterpriseMetricsSpecProvider, _openmetrics_metrics.openmetricsMetricsSpecProvider, _oracle_metrics.oracleMetricsSpecProvider, _iis_metrics.iisMetricsSpecProvider, _azure_logs.azureLogsSpecProvider, _gcp_metrics.gcpMetricsSpecProvider, _auditd_logs.auditdLogsSpecProvider, _barracuda_logs.barracudaLogsSpecProvider, _bluecoat_logs.bluecoatLogsSpecProvider, _cef_logs.cefLogsSpecProvider, _checkpoint_logs.checkpointLogsSpecProvider, _crowdstrike_logs.crowdstrikeLogsSpecProvider, _cylance_logs.cylanceLogsSpecProvider, _f5_logs.f5LogsSpecProvider, _fortinet_logs.fortinetLogsSpecProvider, _gcp_logs.gcpLogsSpecProvider, _gsuite_logs.gsuiteLogsSpecProvider, _haproxy_logs.haproxyLogsSpecProvider, _icinga_logs.icingaLogsSpecProvider, _imperva_logs.impervaLogsSpecProvider, _infoblox_logs.infobloxLogsSpecProvider, _juniper_logs.juniperLogsSpecProvider, _kibana_logs.kibanaLogsSpecProvider, _microsoft_logs.microsoftLogsSpecProvider, _misp_logs.mispLogsSpecProvider, _mongodb_logs.mongodbLogsSpecProvider, _mssql_logs.mssqlLogsSpecProvider, _netscout_logs.netscoutLogsSpecProvider, _o365_logs.o365LogsSpecProvider, _okta_logs.oktaLogsSpecProvider, _panw_logs.panwLogsSpecProvider, _rabbitmq_logs.rabbitmqLogsSpecProvider, _radware_logs.radwareLogsSpecProvider, _santa_logs.santaLogsSpecProvider, _sonicwall_logs.sonicwallLogsSpecProvider, _sophos_logs.sophosLogsSpecProvider, _squid_logs.squidLogsSpecProvider, _tomcat_logs.tomcatLogsSpecProvider, _zscaler_logs.zscalerLogsSpecProvider];
exports.builtInTutorials = builtInTutorials;