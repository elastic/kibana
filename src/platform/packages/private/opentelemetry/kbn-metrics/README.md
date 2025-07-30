# @kbn/metrics

This package includes the logic to initialize the OpenTelemetry Metrics client and its exporters. 

It is intended to be used by the package `@kbn/telemetry`. 

For now, only the `gRPC` and `http` exporters are supported. To enable OTel Metrics, add the following configuration in the `kibana.yml`:

```yaml
telemetry.metrics:
  enabled: true
  interval: 10s
  exporters:
    - grpc:
        url: https://my-ingest-host:my-ingest-port
        headers:
          authorization: "ApiKey [REDACTED]"
```
