---
description: >-
  Shared telemetry config: exports Claude Code OpenTelemetry metrics from the
  agentic workflows to the Elastic agent-observability deployment. Import this
  file to instrument any Claude workflow. Keep the endpoint and every OTEL knob
  here, in one place.

  Requires:
    vars.APPS_DX_AGENT_OBS_OTEL_ENDPOINT  - repo variable, full OTLP endpoint URL
                                             (https://agent-observability-ce9858.ingest.us-east4.gcp.elastic.cloud)
    secrets.APPS_DX_AGENT_OBS_OTEL_SECRET - raw API key value (no prefix)

  If the endpoint URL ever changes, also update the network.allowed entry below
  so the squid firewall continues to permit outbound traffic to the new host.
network:
  allowed:
    - agent-observability-ce9858.ingest.us-east4.gcp.elastic.cloud
env:
  CLAUDE_CODE_ENABLE_TELEMETRY: "1"
  OTEL_METRICS_EXPORTER: otlp
  OTEL_LOGS_EXPORTER: otlp
  OTEL_TRACES_EXPORTER: none
  OTEL_EXPORTER_OTLP_PROTOCOL: http/protobuf
  OTEL_METRIC_EXPORT_INTERVAL: "10000"
  OTEL_LOG_TOOL_DETAILS: "1"
observability:
  otlp:
    endpoint:
      - url: ${{ vars.APPS_DX_AGENT_OBS_OTEL_ENDPOINT }}
        headers:
          Authorization: ApiKey ${{ secrets.APPS_DX_AGENT_OBS_OTEL_SECRET }}
---
