/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import yaml from 'js-yaml';
import { getEdotCollectorConfig } from '@kbn/edot-collector';

/**
 * Extends the base EDOT Collector config with Kubernetes receivers, processors,
 * and pipelines so hosts, pods, containers, and container logs are collected
 * alongside APM-compatible traces/metrics.
 */
export function getEdotK8sCollectorConfig({
  elasticsearchEndpoint,
  username,
  password,
  namespace = 'otel-demo',
  demoId = 'otel-demo',
  logsIndex = 'logs.otel',
}: {
  elasticsearchEndpoint: string;
  username: string;
  password: string;
  namespace?: string;
  demoId?: string;
  logsIndex?: string;
}): string {
  const base = getEdotCollectorConfig({ elasticsearchEndpoint, username, password }) as {
    extensions: Record<string, unknown>;
    receivers: Record<string, unknown>;
    connectors: Record<string, unknown>;
    processors: Record<string, unknown>;
    exporters: Record<string, unknown>;
    service: {
      extensions: string[];
      pipelines: Record<
        string,
        { receivers: string[]; processors?: string[]; exporters: string[] }
      >;
    };
  };

  // -- Receivers -----------------------------------------------------------
  base.receivers.k8s_cluster = {
    collection_interval: '60s',
    auth_type: 'serviceAccount',
    node_conditions_to_report: ['Ready', 'MemoryPressure', 'DiskPressure', 'PIDPressure'],
    allocatable_types_to_report: ['cpu', 'memory', 'storage'],
    metadata_collection_interval: '5m',
    metrics: { 'k8s.pod.status_reason': { enabled: true } },
  };

  base.receivers.kubeletstats = {
    collection_interval: '60s',
    auth_type: 'serviceAccount',
    endpoint: '${env:OTEL_K8S_NODE_NAME}:10250',
    node: '${env:OTEL_K8S_NODE_NAME}',
    insecure_skip_verify: true,
    extra_metadata_labels: ['container.id', 'k8s.volume.type'],
    k8s_api_config: { auth_type: 'serviceAccount' },
    metrics: {
      'k8s.pod.cpu.node.utilization': { enabled: true },
      'k8s.pod.cpu_limit_utilization': { enabled: true },
      'k8s.pod.cpu_request_utilization': { enabled: true },
      'k8s.pod.memory_limit_utilization': { enabled: true },
      'k8s.pod.memory_request_utilization': { enabled: true },
      'k8s.container.cpu_limit_utilization': { enabled: true },
      'k8s.container.cpu_request_utilization': { enabled: true },
      'k8s.container.memory_limit_utilization': { enabled: true },
      'k8s.container.memory_request_utilization': { enabled: true },
    },
  };

  base.receivers.hostmetrics = {
    collection_interval: '60s',
    root_path: '/hostfs',
    scrapers: {
      cpu: {
        metrics: {
          'system.cpu.utilization': { enabled: true },
          'system.cpu.logical.count': { enabled: true },
          'system.cpu.physical.count': { enabled: true },
        },
      },
      memory: {
        metrics: {
          'system.memory.utilization': { enabled: true },
          'system.linux.memory.available': { enabled: true },
        },
      },
      network: {},
      processes: {
        metrics: {
          'system.processes.count': { enabled: true },
          'system.processes.created': { enabled: true },
        },
      },
      load: {},
      disk: {},
      filesystem: { metrics: { 'system.filesystem.utilization': { enabled: true } } },
    },
  };

  base.receivers.k8sobjects = {
    auth_type: 'serviceAccount',
    objects: [{ name: 'events', mode: 'watch', group: 'events.k8s.io', namespaces: [namespace] }],
  };

  base.receivers['filelog/k8s'] = {
    include: [`/var/log/pods/${namespace}_*/*/*.log`],
    exclude: ['/var/log/pods/*/otel-collector/*.log'],
    start_at: 'end',
    include_file_path: true,
    include_file_name: false,
    retry_on_failure: { enabled: true, initial_interval: '1s', max_interval: '30s' },
    operators: [
      {
        type: 'json_parser',
        id: 'parser-docker',
        timestamp: { parse_from: 'attributes.time', layout: '%Y-%m-%dT%H:%M:%S.%LZ' },
      },
      {
        type: 'recombine',
        id: 'multiline',
        combine_field: 'attributes.log',
        is_first_entry: 'attributes.log != nil and attributes.log matches "^[^[:space:]]"',
        combine_with: '\\n',
        max_log_size: 102400,
        source_identifier: 'attributes["log.file.path"]',
      },
      {
        type: 'regex_parser',
        id: 'extract_k8s_metadata',
        regex:
          '^/var/log/pods/(?P<namespace>[^_]+)_(?P<pod>[^_]+)_(?P<uid>[^/]+)/(?P<container>[^/]+)/.*\\.log$',
        parse_from: 'attributes["log.file.path"]',
        on_error: 'send',
      },
      {
        type: 'move',
        id: 'move_namespace',
        from: 'attributes.namespace',
        to: 'resource["k8s.namespace.name"]',
        on_error: 'send',
      },
      {
        type: 'move',
        id: 'move_pod',
        from: 'attributes.pod',
        to: 'resource["k8s.pod.name"]',
        on_error: 'send',
      },
      {
        type: 'move',
        id: 'move_uid',
        from: 'attributes.uid',
        to: 'resource["k8s.pod.uid"]',
        on_error: 'send',
      },
      {
        type: 'move',
        id: 'move_container',
        from: 'attributes.container',
        to: 'resource["k8s.container.name"]',
        on_error: 'send',
      },
      {
        type: 'move',
        id: 'move_stream',
        from: 'attributes.stream',
        to: 'attributes["log.iostream"]',
        on_error: 'send',
      },
      { type: 'move', id: 'move_log_to_body', from: 'attributes.log', to: 'body' },
      {
        type: 'json_parser',
        id: 'parse_application_json',
        parse_from: 'body',
        parse_to: 'attributes',
        if: 'body matches "^{.*}[[:space:]]*$"',
        on_error: 'send',
      },
      {
        type: 'move',
        id: 'extract_json_message',
        from: 'attributes.message',
        to: 'body',
        if: 'attributes.message != nil',
      },
      {
        type: 'move',
        id: 'extract_severity',
        from: 'attributes.severity',
        to: 'attributes["log.level"]',
        if: 'attributes.severity != nil',
      },
      {
        type: 'move',
        id: 'extract_level',
        from: 'attributes.level',
        to: 'attributes["log.level"]',
        if: 'attributes.level != nil',
      },
      {
        type: 'move',
        id: 'extract_timestamp',
        from: 'attributes.timestamp',
        to: 'attributes["log.timestamp"]',
        if: 'attributes.timestamp != nil',
      },
      {
        type: 'move',
        id: 'extract_time',
        from: 'attributes.time',
        to: 'attributes["log.timestamp"]',
        if: 'attributes.time != nil',
      },
    ],
  };

  // -- Processors ----------------------------------------------------------
  base.processors.batch = { timeout: '1s', send_batch_size: 1024 };

  base.processors.k8sattributes = {
    auth_type: 'serviceAccount',
    passthrough: false,
    extract: {
      metadata: [
        'k8s.namespace.name',
        'k8s.deployment.name',
        'k8s.pod.name',
        'k8s.pod.uid',
        'k8s.node.name',
        'k8s.container.name',
        'container.id',
        'container.image.name',
        'container.image.tag',
      ],
      labels: [
        { tag_name: 'app', key: 'app', from: 'pod' },
        { tag_name: 'app.kubernetes.io/name', key: 'app.kubernetes.io/name', from: 'pod' },
        { tag_name: 'app.kubernetes.io/part-of', key: 'app.kubernetes.io/part-of', from: 'pod' },
      ],
    },
    pod_association: [
      { sources: [{ from: 'resource_attribute', name: 'k8s.pod.uid' }] },
      {
        sources: [
          { from: 'resource_attribute', name: 'k8s.pod.name' },
          { from: 'resource_attribute', name: 'k8s.namespace.name' },
        ],
      },
      { sources: [{ from: 'resource_attribute', name: 'k8s.pod.ip' }] },
      { sources: [{ from: 'connection' }] },
    ],
  };

  base.processors.resourcedetection = {
    detectors: ['env', 'system'],
    system: {
      hostname_sources: ['os'],
      resource_attributes: {
        'host.name': { enabled: true },
        'os.type': { enabled: true },
        'host.arch': { enabled: true },
      },
    },
  };

  base.processors.resource = {
    attributes: [
      { key: 'service.namespace', value: namespace, action: 'upsert' },
      { key: 'deployment.environment', value: demoId, action: 'upsert' },
      { key: 'deployment.environment.name', value: demoId, action: 'upsert' },
    ],
  };

  // Route logs to the configured index via the elasticsearch.index attribute
  // (same approach used by the onboarding flow's Helm chart)
  base.processors['resource/wired_streams'] = {
    attributes: [{ key: 'elasticsearch.index', value: logsIndex, action: 'upsert' }],
  };

  base.processors.cumulativetodelta = {};

  // -- Exporters -----------------------------------------------------------
  base.exporters.debug = { verbosity: 'basic' };

  // -- Pipelines -----------------------------------------------------------
  const pipelines = base.service.pipelines;

  // OTLP logs: feed to elasticapm for APM error detection.
  // The elasticapm connector internally routes processed events to ES
  // (landing in logs-generic.otel-default); we can't control that routing.
  // Container logs go to logs.otel via the logs/k8s pipeline instead.
  delete pipelines.logs;
  pipelines['logs/otlp'] = {
    receivers: ['otlp'],
    exporters: ['elasticapm', 'debug'],
  };

  pipelines['logs/k8s'] = {
    receivers: ['filelog/k8s'],
    processors: [
      'k8sattributes',
      'resourcedetection',
      'resource',
      'resource/wired_streams',
      'batch',
    ],
    exporters: ['elasticsearch', 'debug'],
  };

  pipelines['logs/k8s_events'] = {
    receivers: ['k8sobjects'],
    processors: ['resourcedetection', 'resource', 'resource/wired_streams', 'batch'],
    exporters: ['elasticsearch', 'debug'],
  };

  pipelines.traces = {
    receivers: ['otlp'],
    processors: ['k8sattributes', 'resourcedetection', 'resource', 'elasticapm', 'batch'],
    exporters: ['elasticapm', 'elasticsearch', 'debug'],
  };

  pipelines.metrics = {
    receivers: ['otlp'],
    processors: ['k8sattributes', 'resourcedetection', 'resource', 'cumulativetodelta', 'batch'],
    exporters: ['elasticsearch', 'debug'],
  };

  pipelines['metrics/aggregated'] = {
    receivers: ['elasticapm'],
    exporters: ['elasticsearch', 'debug'],
  };

  pipelines['metrics/k8s'] = {
    receivers: ['k8s_cluster', 'kubeletstats', 'hostmetrics'],
    processors: ['resourcedetection', 'resource', 'cumulativetodelta', 'batch'],
    exporters: ['elasticsearch', 'debug'],
  };

  return yaml.dump(base);
}
