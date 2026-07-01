# @kbn/tracing

This package includes the logic to initialize the OpenTelemetry Tracing client and its exporters.

It is intended to be used by the package `@kbn/telemetry`.

---

## Enable OTel Tracing

[Kibana debugging](https://www.elastic.co/docs/extend/kibana/kibana-debugging) has some very minimal piece of configuration to enable Kibana OTel tracing.

> [!TIP]
> The best way to get started is by using an ECH deployment. It offers a Managed OTLP endpoint (mOTLP) that you can use to ship your OTel Traces, Metrics and Logs without the hassle of starting one locally.

Below is a larger piece of config with examples for all the supported exporters:

```yaml
# Sample 20 % of root spans (fallback when no parent span exists)
telemetry.tracing.sample_rate: 0.2

# One or more exporters
telemetry.tracing.exporters:
  # OTLP Proto exporter (for APM Server, OpenTelemetry Collector, etc.)
  - proto:
      url: 'http://localhost:4318/v1/traces' # OTLP HTTP/Proto receiver endpoint
      headers:
        Authorization: 'Bearer ${SECRET_TOKEN}' # optional
      scheduled_delay: 2000

  # OTLP HTTP exporter (for APM Server, OpenTelemetry Collector, etc.)
  - http:
      url: 'http://localhost:4318/v1/traces' # OTLP HTTP receiver endpoint
      headers:
        Authorization: 'Bearer ${SECRET_TOKEN}' # optional
      scheduled_delay: 2000

  # OTLP gRPC exporter
  - grpc:
      url: 'http://localhost:4317' # OTLP gRPC receiver endpoint
      headers:
        Authorization: 'Bearer ${SECRET_TOKEN}' # optional
      scheduled_delay: 2000

  ### Inference-specific exporters ###
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
```

---

## Instrumenting new traces

The recommendation for Kibana developers is to use the `withActiveSpan` utility exposed by the package `@kbn/tracing-utils`:

```TS
import { withActiveSpan } from '@kbn/tracing-utils';

const result = await withActiveSpan('my_parent_span', { attributes: { ... } }, async (parentSpan) => {
  /** do my critical piece of work */

  // Create more subspans if needed
  const meaningOfLife = withActiveSpan('my_sub_span', { attributes: { ... } }, () => 42);

  // I can interact with the span if needed
  parentSpan?.setAttribute('kibana.meaning_of_life', meaningOfLife);

  return meaningfulResult;
});
```

The `withActiveSpan` utility abstracts the verbose OTel Traces API. It is designed to correctly handle span closing and error appending for synchronous, asynchronous, and RxJS observable code. If preferred, you may still use the vanilla instrumentation via the `@opentelemetry/api` package.
