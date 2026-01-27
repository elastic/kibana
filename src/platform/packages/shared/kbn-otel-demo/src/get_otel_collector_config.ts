/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Generates the OTel Collector configuration for Kubernetes deployment.
 * Collects container logs from Kubernetes nodes and forwards them to Elasticsearch.
 * OTLP traces and metrics are accepted but only exported to debug (not Elasticsearch).
 * Uses k8sattributes processor for proper pod/container metadata enrichment.
 */
export function getFullOtelCollectorConfig({
  elasticsearchEndpoint,
  username,
  password,
  logsIndex = 'logs',
  namespace = 'otel-demo',
}: {
  elasticsearchEndpoint: string;
  username: string;
  password: string;
  logsIndex?: string;
  namespace?: string;
}): string {
  const configYaml = `
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

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
      # Parse Docker JSON format logs (used by minikube with Docker driver)
      # Format: {"log":"...","stream":"stdout|stderr","time":"..."}
      - type: json_parser
        id: parser-docker
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'

      # Recombine multiline logs (stack traces)
      # First entry = starts with non-whitespace char (timestamps, log levels, etc.)
      # Continuation = starts with whitespace, "at ", "Caused by:", etc.
      - type: recombine
        id: multiline
        combine_field: attributes.log
        is_first_entry: 'attributes.log != nil and attributes.log matches "^[^[:space:]]"'
        combine_with: "\\n"
        max_log_size: 102400
        source_identifier: attributes["log.file.path"]

      # Extract k8s metadata from file path
      # Path format: /var/log/pods/<namespace>_<pod>_<uid>/<container>/<restart_count>.log
      - type: regex_parser
        id: extract_k8s_metadata
        regex: '^/var/log/pods/(?P<namespace>[^_]+)_(?P<pod>[^_]+)_(?P<uid>[^/]+)/(?P<container>[^/]+)/.*\\.log$'
        parse_from: attributes["log.file.path"]
        on_error: send

      # Move parsed k8s metadata to resource attributes
      - type: move
        id: move_namespace
        from: attributes.namespace
        to: resource["k8s.namespace.name"]
        on_error: send

      - type: move
        id: move_pod
        from: attributes.pod
        to: resource["k8s.pod.name"]
        on_error: send

      - type: move
        id: move_uid
        from: attributes.uid
        to: resource["k8s.pod.uid"]
        on_error: send

      - type: move
        id: move_container
        from: attributes.container
        to: resource["k8s.container.name"]
        on_error: send

      # Move stream to attributes
      - type: move
        id: move_stream
        from: attributes.stream
        to: attributes["log.iostream"]
        on_error: send

      # Move the log message to body
      - type: move
        id: move_log_to_body
        from: attributes.log
        to: body

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
        value: otel-demo
        action: upsert
      - key: deployment.environment
        value: local-minikube
        action: upsert

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
    logs_index: LOGS_INDEX_PLACEHOLDER
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
    # Accept traces but only export to debug (not Elasticsearch)
    traces:
      receivers: [otlp]
      processors: [k8sattributes, resourcedetection, resource, batch]
      exporters: [debug]
    # Accept metrics but only export to debug (not Elasticsearch)
    metrics:
      receivers: [otlp]
      processors: [k8sattributes, resourcedetection, resource, batch]
      exporters: [debug]
`;

  return configYaml
    .replace(/ELASTICSEARCH_ENDPOINT_PLACEHOLDER/g, elasticsearchEndpoint)
    .replace(/USERNAME_PLACEHOLDER/g, username)
    .replace(/PASSWORD_PLACEHOLDER/g, password)
    .replace(/LOGS_INDEX_PLACEHOLDER/g, logsIndex);
}
