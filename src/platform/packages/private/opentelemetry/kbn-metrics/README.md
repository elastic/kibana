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

Whenever you want to instrument your code with any metric, you can do this with these 2 simple steps:

1. Get your meter scoped to your plugin or area of the code.
2. Create your metric and record values. The metrics can be a counter, gauge, or histogram (to learn the differences, refer to the [OTel docs](https://opentelemetry.io/docs/specs/otel/metrics/api/#meter-operations)).
   * Mind that there are 2 (+1) flavors of these APIs:
     1. Push-based: you can increment the counter, or record new measurements to your metric whenever an event happens.
     2. Pull-based (includes `*Observable*` in the API's name): you provide a fetcher to be called when the exporter is about to report.
     3. Pull-based with a batching mechanism: using `meter.addBatchObservableCallback` you can optimize the collection of metrics by batching them together, so the same result from an API can be reported in multiple metrics.

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
  .addCallback((result) => {
    result.observe(process.uptime(), { ...anyOptionalLabels });
  });

// 2.3. Batching metric
const memoryHeapLimit = meter.createObservableUpDownCounter('v8js.memory.heap.limit');
const memoryHeapUsed = meter.createObservableUpDownCounter('v8js.memory.heap.used');
const memoryHeapAvailable = meter.createObservableUpDownCounter('v8js.memory.heap.available_size');
const memoryHeapPhysical = meter.createObservableUpDownCounter('v8js.memory.heap.physical_size');

meter.addBatchObservableCallback((result) => {
  v8.getHeapSpaceStatistics().forEach((space) => {
    const attributes = {
      'v8js.heap.space.name': space.space_name,
    };
    result.observe(memoryHeapLimit, space.space_size, attributes);
    result.observe(memoryHeapUsed, space.space_used_size, attributes);
    result.observe(memoryHeapAvailable, space.space_available_size, attributes);
    result.observe(memoryHeapPhysical, space.physical_space_size, attributes);
  });
})
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

### Naming convention

It is highly recommended to adhere to OTel's official naming convention: https://opentelemetry.io/docs/specs/semconv/general/naming/

A few highlights:

1. Double-check the OTel docs to identify if your metric already has an official name.
2. Use dot-notation to separate the different parts of the metric name. Snake_case is also allowed in some cases.
3. Typically, [these instrument names](https://opentelemetry.io/docs/specs/semconv/general/naming/#instrument-naming) should cover most of the metrics.

### Which metric type should I use?

The [OTel docs](https://opentelemetry.io/docs/concepts/signals/metrics/) provide a good overview of the different types of metrics.

A quick summary:

1. Use Histogram when you are able to record your metric in push-based mode, and when you're interested in value statistics like _How many requests took less than 1s?_.
2. The difference between a Counter and an UpDownCounter is that the former is an always growing metric, while the latter can increase or decrease.
3. Use a Counter (or UpDownCounter) instead of a Gauge if your metric can be summed up (e.g. number of requests or process' memory usage). 
4. Use a Gauge when it doesn't make sense to sum up the metric (e.g. process' uptime or event loop delay).
