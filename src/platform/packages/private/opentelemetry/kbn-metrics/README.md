# @kbn/metrics

This package includes the logic to initialize the OpenTelemetry Metrics client and its exporters. 

It is intended to be used by the package `@kbn/telemetry`. 

### Enable OTel Metrics

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

#### Special case: Monitoring Collection

This package also takes care of initializing the metric exporters defined in the Monitoring Collection plugin. Refer to the [plugin's docs](../../../../../../x-pack/platform/plugins/private/monitoring_collection/README.md) for more info about those exporters.

### Instrument your code with metrics

Whenever you want to instrument your code with any metric, you can do this with these 4 simple steps:

1. Get your meter scoped to your plugin or area of the code.
2. Create your metric and record values. The metrics can be a counter, gauge, or histogram (to learn the differences, refer to the [OTel docs](https://opentelemetry.io/docs/specs/otel/metrics/api/#meter-operations)).
   * Mind that there are 2 flavors of these APIs:
     1. Push based: you can increment the counter whenever an event happens.
     2. Pull based (includes `*Observable*` in the API's name): you provide a fetcher to be called when the exporter is about to report.

```typescript
import { metrics } from '@opentelemetry/api';

// 1. Get the scoped meter: this sets the field `scoped.name: "kibana.ops"`.
const meter = metrics.getMeter('kibana.ops');

// 2. Create the metric: the name of the counter ends as `metrics.uptime` in the document.
// NOTE: All counters registered for the same meter are reported in the same document.

// 2.1 Push metric
const metricShort = meter.createGauge('elu.history.short', { valueType: ValueType.DOUBLE });
const metricMedium = meter.createGauge('elu.history.medium', { valueType: ValueType.DOUBLE });
const metricLong = meter.createGauge('elu.history.medium', { valueType: ValueType.DOUBLE });
this.elu$.subscribe(({ short, medium, long }) => {
  metricShort.record(short, { ...anyOptionalLabels });
  metricMedium.record(medium, { ...anyOptionalLabels });
  metricLong.record(long, { ...anyOptionalLabels });
});

// 2.2. Observable metric
meter
  .createObservableCounter('uptime', { unit: 's', valueType: ValueType.INT })
  .addCallback((observable) => {
    observable.observe(process.uptime(), { ...anyOptionalLabels });
  });
```

#### Structure of the document

When shipping the metric through an OTLP exporter, the document stored in ES looks like below (following the metrics registered above):

```JSONC
{
  "resource": {
    "attributes": {
      "service": {
        "name": "kibana",
        "version": "9.2.0"
      }
    }
  },
  "scope": {
    "name": "kibana.ops"
  },
  "metrics": {
    "uptime": 10,
    "elu": {
      "history": {
        "short": 0.8,
        "medium": 0.5,
        "long": 0.2
      }
    }
  },
  "attributes": {
    ...anyOptionalLabels
  }
}
```
