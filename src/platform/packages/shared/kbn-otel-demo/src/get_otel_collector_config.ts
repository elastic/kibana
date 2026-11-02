/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stringify } from 'yaml';
import { CONTAINER_LOG_OPERATORS } from './container_log_operators';

/**
 * Generates the OTel Collector configuration for Kubernetes deployment.
 * Collects container logs, Kubernetes metrics, and host metrics from Kubernetes nodes.
 * OTLP traces are exported to Elasticsearch and used to generate span metrics.
 * OTLP metrics are accepted but only exported to debug (not Elasticsearch).
 * Uses k8sattributes processor for proper pod/container metadata enrichment.
 */
export function getFullOtelCollectorConfig({
  elasticsearchEndpoint,
  username,
  password,
  logsIndex,
  namespace = 'otel-demo',
  demoId = 'otel-demo',
}: {
  elasticsearchEndpoint: string;
  username: string;
  password: string;
  /** Index for container logs and k8s events. Unset: the default `logs-generic.otel-default` data stream. */
  logsIndex?: string;
  namespace?: string;
  demoId?: string;
}): string {
  const configYaml = `
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Kubernetes cluster metrics receiver - collects cluster-level metrics
  k8s_cluster:
    collection_interval: 60s
    auth_type: serviceAccount
    node_conditions_to_report:
      - Ready
      - MemoryPressure
      - DiskPressure
      - PIDPressure
    allocatable_types_to_report:
      - cpu
      - memory
      - storage
    metadata_collection_interval: 5m
    metrics:
      k8s.pod.status_reason:
        enabled: true

  # Kubelet stats receiver - collects node, pod, and container metrics
  kubeletstats:
    collection_interval: 60s
    auth_type: serviceAccount
    endpoint: "\${env:OTEL_K8S_NODE_NAME}:10250"
    node: "\${env:OTEL_K8S_NODE_NAME}"
    insecure_skip_verify: true
    extra_metadata_labels:
      - container.id
      - k8s.volume.type
    k8s_api_config:
      auth_type: serviceAccount
    metrics:
      k8s.pod.cpu.node.utilization:
        enabled: true
      k8s.pod.cpu_limit_utilization:
        enabled: true
      k8s.pod.cpu_request_utilization:
        enabled: true
      k8s.pod.memory_limit_utilization:
        enabled: true
      k8s.pod.memory_request_utilization:
        enabled: true
      k8s.container.cpu_limit_utilization:
        enabled: true
      k8s.container.cpu_request_utilization:
        enabled: true
      k8s.container.memory_limit_utilization:
        enabled: true
      k8s.container.memory_request_utilization:
        enabled: true

  # Host metrics receiver - collects host system metrics
  hostmetrics:
    collection_interval: 60s
    root_path: /hostfs
    scrapers:
      cpu:
        metrics:
          system.cpu.utilization:
            enabled: true
          system.cpu.logical.count:
            enabled: true
          system.cpu.physical.count:
            enabled: true
      memory:
        metrics:
          system.memory.utilization:
            enabled: true
          system.linux.memory.available:
            enabled: true
      network:
      processes:
        metrics:
          system.processes.count:
            enabled: true
          system.processes.created:
            enabled: true
      load:
      disk:
      filesystem:
        metrics:
          system.filesystem.utilization:
            enabled: true

  # Kubernetes objects receiver - collects k8s events as logs
  k8sobjects:
    auth_type: serviceAccount
    objects:
      - name: events
        mode: watch
        group: events.k8s.io
        namespaces: [${namespace}]

  # Filelog receiver for Kubernetes container logs
  filelog/k8s:
    include:
      - /var/log/pods/${namespace}_*/*/*.log
    exclude:
      - /var/log/pods/*/otel-collector/*.log
    start_at: end
    include_file_path: true
    include_file_name: false
    retry_on_failure:
      enabled: true
      initial_interval: 1s
      max_interval: 30s
    operators:
      # Container runtime parsing (Docker JSON or CRI) and multiline recombination,
      # see container_log_operators.ts
CONTAINER_LOG_OPERATORS_PLACEHOLDER

      # Try to parse body as JSON (for structured logs from services)
      # Only attempt if body looks like JSON (starts with { and ends with }, allowing trailing whitespace)
      - type: json_parser
        id: parse_application_json
        parse_from: body
        parse_to: attributes
        if: 'body matches "^{.*}[[:space:]]*$"'
        on_error: send

      # Extract common JSON log fields to standardized attributes
      # Only move fields that exist to avoid errors
      - type: move
        id: extract_json_message
        from: attributes.message
        to: body
        if: 'attributes.message != nil'

      - type: move
        id: extract_severity
        from: attributes.severity
        to: attributes["log.level"]
        if: 'attributes.severity != nil'

      - type: move
        id: extract_level
        from: attributes.level
        to: attributes["log.level"]
        if: 'attributes.level != nil'

      - type: move
        id: extract_timestamp
        from: attributes.timestamp
        to: attributes["log.timestamp"]
        if: 'attributes.timestamp != nil'

      - type: move
        id: extract_time
        from: attributes.time
        to: attributes["log.timestamp"]
        if: 'attributes.time != nil'

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

  # Kubernetes attributes processor - enriches with pod/container metadata
  k8sattributes:
    auth_type: "serviceAccount"
    passthrough: false
    extract:
      metadata:
        - k8s.namespace.name
        - k8s.deployment.name
        - k8s.pod.name
        - k8s.pod.uid
        - k8s.node.name
        - k8s.container.name
        - container.id
        - container.image.name
        - container.image.tag
      labels:
        - tag_name: app
          key: app
          from: pod
        - tag_name: app.kubernetes.io/name
          key: app.kubernetes.io/name
          from: pod
        - tag_name: app.kubernetes.io/part-of
          key: app.kubernetes.io/part-of
          from: pod
    pod_association:
      - sources:
          - from: resource_attribute
            name: k8s.pod.uid
      - sources:
          - from: resource_attribute
            name: k8s.pod.name
          - from: resource_attribute
            name: k8s.namespace.name
      - sources:
          - from: resource_attribute
            name: k8s.pod.ip
      - sources:
          - from: connection

  # Detect resource attributes
  resourcedetection:
    detectors: [env, system]
    system:
      hostname_sources: ["os"]
      resource_attributes:
        host.name:
          enabled: true
        os.type:
          enabled: true
        host.arch:
          enabled: true

  # Add namespace attributes
  resource:
    attributes:
      - key: service.namespace
        value: ${namespace}
        action: upsert
      - key: deployment.environment
        value: ${demoId}
        action: upsert
      - key: deployment.environment.name
        value: ${demoId}
        action: upsert

  # Convert cumulative histograms to delta (required by Elasticsearch exporter)
  cumulativetodelta:

  # Filter to drop all OTLP logs (we only want filelog container logs)
  filter/drop_otlp_logs:
    error_mode: ignore
    logs:
      log_record:
        - 'true'

exporters:
  debug:
    verbosity: basic
  elasticsearch:
    endpoints:
      - ELASTICSEARCH_ENDPOINT_PLACEHOLDER
    user: USERNAME_PLACEHOLDER
    password: PASSWORD_PLACEHOLDER
LOGS_INDEX_PLACEHOLDER
    traces_index: traces-generic.otel-default
    mapping:
      mode: otel
    tls:
      insecure: true
    sending_queue:
      enabled: true
      num_consumers: 20
      queue_size: 1000
    retry:
      enabled: true
      initial_interval: 100ms
      max_interval: 30s

connectors:
  # Generates metrics from trace spans (latency, call counts, error rates)
  spanmetrics:
    histogram:
      explicit:
        buckets: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
    dimensions:
      - name: service.namespace
      - name: deployment.environment
      - name: k8s.namespace.name
      - name: k8s.deployment.name
    exemplars:
      enabled: true
    metrics_flush_interval: 15s
    aggregation_temporality: AGGREGATION_TEMPORALITY_DELTA

extensions:
  health_check:
    endpoint: 0.0.0.0:13133

service:
  extensions: [health_check]
  pipelines:
    # Accept OTLP logs but drop them (services need somewhere to send logs)
    logs/otlp:
      receivers: [otlp]
      processors: [filter/drop_otlp_logs]
      exporters: [debug]
    # Collect container logs via filelog with k8s enrichment
    logs/k8s:
      receivers: [filelog/k8s]
      processors: [k8sattributes, resourcedetection, resource, batch]
      exporters: [elasticsearch, debug]
    # Collect Kubernetes events as logs
    logs/k8s_events:
      receivers: [k8sobjects]
      processors: [resourcedetection, resource, batch]
      exporters: [elasticsearch, debug]
    # Export traces to Elasticsearch and generate span metrics
    traces:
      receivers: [otlp]
      processors: [k8sattributes, resourcedetection, resource, batch]
      exporters: [elasticsearch, spanmetrics, debug]
    # Accept metrics from OTLP and span metrics connector
    metrics:
      receivers: [otlp, spanmetrics]
      processors: [k8sattributes, resourcedetection, resource, cumulativetodelta, batch]
      exporters: [elasticsearch, debug]
    # Collect Kubernetes metrics (cluster, kubelet, host)
    metrics/k8s:
      receivers: [k8s_cluster, kubeletstats, hostmetrics]
      processors: [resourcedetection, resource, cumulativetodelta, batch]
      exporters: [elasticsearch, debug]
`;

  return configYaml
    .replace(/ELASTICSEARCH_ENDPOINT_PLACEHOLDER/g, elasticsearchEndpoint)
    .replace(/USERNAME_PLACEHOLDER/g, username)
    .replace(/PASSWORD_PLACEHOLDER/g, password)
    .replace('LOGS_INDEX_PLACEHOLDER\n', logsIndex ? `    logs_index: ${logsIndex}\n` : '')
    .replace(
      'CONTAINER_LOG_OPERATORS_PLACEHOLDER\n',
      `${stringify([...CONTAINER_LOG_OPERATORS])
        .trimEnd()
        .replace(/^/gm, '      ')}\n`
    );
}
