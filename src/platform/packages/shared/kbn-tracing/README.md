# @kbn/tracing

OpenTelemetry tracing bootstrap for Kibana Node processes.

`initTracing()` wires up the global `NodeTracerProvider`, sampling, context propagation and registers inference-tracing exporters (Phoenix / Langfuse / OTLP) when configured in `kibana.yml`. OpenTelemetry tracing is disabled by default and should not be enabled in conjuction with Elastic APM.

---

## 1. Configure tracing in `kibana.yml`

```yaml
# Sample 20 % of root spans (fallback when no parent span exists)
telemetry.tracing.sample_rate: 0.2

# One or more exporters
telemetry.tracing.exporters:
  # Phoenix exporter
  - phoenix:
      base_url: 'https://api.phoenix.dev'
      public_url: 'https://app.phoenix.dev' # optional, used for UI links
      project_name: 'my-project' # optional, defaults to first project
      api_key: '${PHOENIX_API_KEY}' # optional, Bearer token
      scheduled_delay: 2000 # flush interval (ms)

  # Langfuse exporter
  - langfuse:
      base_url: 'https://app.langfuse.com' # both API + UI
      public_key: '${LANGFUSE_PUBLIC_KEY}'
      secret_key: '${LANGFUSE_SECRET_KEY}'
      scheduled_delay: 2000

  # OTLP exporter (for APM Server, OpenTelemetry Collector, or other OTLP backends)
  - otlp:
      url: 'http://localhost:4318/v1/traces' # OTLP receiver endpoint
      protocol: 'http' # or 'grpc'
      headers:
        Authorization: 'Bearer ${SECRET_TOKEN}' # optional
      scheduled_delay: 2000
```

The YAML follows the schema exported from `@kbn/inference-tracing-config`:

- `InferenceTracingPhoenixExportConfig`
- `InferenceTracingLangfuseExportConfig`
- `InferenceTracingOTLPExportConfig`

See those types for a full list of allowed fields.

### OTLP Backend Compatibility

The OTLP exporter works with any OTLP-compatible receiver, including:

- **OpenTelemetry Collector** (recommended for flexibility and fan-out capabilities)
- APM Server (for viewing in Kibana APM UI)
- Jaeger with OTLP receiver
- Grafana Tempo
- Any other OTLP-compatible observability backend

Using an OpenTelemetry Collector as an intermediary is recommended as it allows you to forward traces to multiple backends, apply processing/filtering, and handle backpressure.

---

## 2. What happens at runtime?

1. `src/cli/apm.js` calls `initTracing()` early in process start-up.
2. `initTracing()`
   - installs `AsyncLocalStorage` context management,
   - applies the configured sample rate (parent-based),
   - adds a `LateBindingSpanProcessor` so exporters can be registered later,
   - creates a `NodeTracerProvider` with resource attributes derived from the Elastic APM config,
   - for each entry under `telemetry.tracing.exporters` instantiates the corresponding span processor from `@kbn/inference-tracing` and registers it.

After this, any code using the helpers from `@kbn/inference-tracing` (`withActiveInferenceSpan`, `withChatCompleteSpan`, …) will produce spans that are forwarded to Phoenix / Langfuse / OTLP backends.

No additional application code is needed—configuration alone enables exporting.
