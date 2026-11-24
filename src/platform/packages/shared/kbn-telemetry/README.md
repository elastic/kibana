# @kbn/telemetry

Contains initialization functions and utilities for Telemetry (as in, OpenTelemetry).

## How to enable OpenTelemetry instrumentation in Kibana

The following config is the recommended minimum piece of config for instrumenting OpenTelemetry traces, metrics and logs:

```YAML
# For server logs
logging.appenders.otel:
  type: otel
  protocol: proto
  url: <URL_TO_THE_OTLP_ENDPOINT>/v1/logs
  headers:
    authorization: "ApiKey [REDACTED]"

logging.root.appenders: [ default, otel ] # "default" keeps logging to console. Remove if not wanted.

# For server metrics
telemetry.metrics:
  enabled: true
  interval: 10s
  exporters:
    - proto:
        url: <URL_TO_THE_OTLP_ENDPOINT>/v1/metrics
        headers:
          authorization: "ApiKey [REDACTED]"

# For server traces
telemetry.tracing:
  enabled: true
  sample_rate: 1 # 100% of the traces
  exporters:
    - proto:
        url: <URL_TO_THE_OTLP_ENDPOINT>/v1/traces
        headers:
          authorization: 'ApiKey [REDACTED]'

# For browser traces with EDOT Browser (experimental, runs alongside the APM RUM agent).
# The url and headers are sent to every browser, so they must not contain secrets.
telemetry.tracing.browser:
  enabled: true
  url: <URL_TO_THE_BROWSER_OTLP_COLLECTOR> # must allow CORS from Kibana's origin
  headers: {}
# Keep any other origins your deployment already allows (e.g. the APM Server URL used by RUM below).
csp.connect_src: ['<URL_TO_THE_BROWSER_OTLP_COLLECTOR>', '<URL_TO_THE_APM_SERVER>']

# For RUM traces (pending to be migrated to OTel when OTel RUM is production-ready)
elastic.apm:
  serverUrl: <URL_TO_THE_APM_SERVER>
  # Below are optional
  environment: localhost
  transactionSampleRate: 1 # 100% of the traces in RUM
```

> [!TIP]
> The best way to get started is by using an ECH deployment. It offers a Managed OTLP endpoint (mOTLP) that you can use to ship your OTel Traces, Metrics and Logs without the hassle of starting one locally. The same applies to the APM Server.
> To retrieve the `<URL_TO_THE_OTLP_ENDPOINT>` and the `ApiKey`, in the Kibana of your ECH deployment, head to `Observability` > `Add data` (top-right corner) > `Application` > `OpenTelemetry`. The URL and credentials will be shown in the section `Configure the OpenTelemetry SDK`.

> [!IMPORTANT]
> The browser cannot use the managed OTLP endpoint API key above without exposing it to every user. If your upstream needs credentials, point `telemetry.tracing.browser.url` at a CORS-enabled collector or proxy that adds them server-side.
> When `telemetry.tracing.browser.enabled` is true, the APM RUM agent stops instrumenting `fetch` and XHR requests, so EDOT Browser owns trace propagation. Those request traces are expected to move from the APM Server to the OTLP destination; RUM keeps page-load, route-change and error data.

## How to instrument each type of signal

- **Logs**: Use the core logger as you've been using up until now. No changes required.
- **Metrics**: Refer to [`@kbn/metrics` docs](../../private/opentelemetry/kbn-metrics/README.md).
- **Traces**: Refer to [`@kbn/tracing` docs](../kbn-tracing/README.md).
