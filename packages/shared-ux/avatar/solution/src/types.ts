/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// Manual, exhaustive list at present.  This was attempted dynamically using Typescript Template Literals and
// the computation cost exceeded the benefit.  By enumerating them manually, we reduce the complexity of TS
// checking at the expense of not being dynamic against a very, very static list.
//
// It's likely not all of these are relevant, and that's ok.  The original logic tested against all `EuiIconType`
// values that begin with `logo`, and this list matches.
//
// The only consequence is requiring a solution name without a space, (e.g. `ElasticStack`) until it's added
// here.  That's easy to do in the very unlikely event that ever happens.
//
// We may consider reducing this list to those that we consider "solutions".  That would be ok, too.  For now,
// we're just keeping it as a manual, exhaustive list.
export type SolutionNameType =
  | 'AWS'
  | 'AWS Mono'
  | 'Aerospike'
  | 'Apache'
  | 'App Search'
  | 'Azure'
  | 'Azure Mono'
  | 'Beats'
  | 'Business Analytics'
  | 'Ceph'
  | 'Cloud'
  | 'Cloud Enterprise'
  | 'Code'
  | 'Codesandbox'
  | 'Couchbase'
  | 'Docker'
  | 'Dropwizard'
  | 'Elastic'
  | 'Elastic Stack'
  | 'Elasticsearch'
  | 'Enterprise Search'
  | 'Etcd'
  | 'GCP'
  | 'GCPMono'
  | 'Github'
  | 'Gmail'
  | 'Golang'
  | 'GoogleG'
  | 'HAproxy'
  | 'IBM'
  | 'IBM Mono'
  | 'Kafka'
  | 'Kibana'
  | 'Kubernetes'
  | 'Logging'
  | 'Logstash'
  | 'Maps'
  | 'Memcached'
  | 'Metrics'
  | 'Mongodb'
  | 'MySQL'
  | 'Nginx'
  | 'Observability'
  | 'Osquery'
  | 'Php'
  | 'Postgres'
  | 'Prometheus'
  | 'Rabbitmq'
  | 'Redis'
  | 'Security'
  | 'Site Search'
  | 'Sketch'
  | 'Slack'
  | 'Uptime'
  | 'Webhook'
  | 'Windows'
  | 'Workplace Search';
