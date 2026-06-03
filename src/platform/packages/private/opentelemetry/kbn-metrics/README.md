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
   * Mind that there are 2 flavors of these APIs:
     1. Push-based: You can increment the counter or record new measurements to your metric whenever an event happens.
     2. Pull-based (includes `*Observable*` in the API's name): You provide a fetcher to be called when the exporter is about to report.
        + If multiple pull-based metrics come from the result of the same method, you can optimize their collection by batching their callbacks together using `meter.addBatchObservableCallback`.

```typescript
import { metrics } from '@opentelemetry/api';

// 1. Get the scoped meter: this sets the field `scoped.name: "kibana.ops"`.
const meter = metrics.getMeter('kibana.ops');

// 2. Create the metric: the name of the counter ends as `metrics.uptime` in the document.
// NOTE: All counters registered for the same meter are reported in the same document.

// 2.a. Push metric
const metricShort = meter.createGauge('elu.history.short', {
  description: "The short-term event loop utilization history.",
  unit: '1',
  valueType: ValueType.DOUBLE,
});
const metricMedium = meter.createGauge('elu.history.medium', {
  description: "The medium-term event loop utilization history.",
  unit: '1',
  valueType: ValueType.DOUBLE,
});
const metricLong = meter.createGauge('elu.history.medium', {
  description: "The long-term event loop utilization history.",
  unit: '1',
  valueType: ValueType.DOUBLE,
});
this.elu$.subscribe(({ short, medium, long }) => {
  metricShort.record(short, { ...anyOptionalLabels });
  metricMedium.record(medium, { ...anyOptionalLabels });
  metricLong.record(long, { ...anyOptionalLabels });
});

// 2.b. Observable metric
meter
  .createObservableCounter('process.uptime', { description: 'Process uptime', unit: 's', valueType: ValueType.INT })
  .addCallback((result) => {
    result.observe(process.uptime(), { ...anyOptionalLabels });
  });

// 2.b.+ Batching multiple observable metrics
const memoryHeapLimit = meter.createObservableUpDownCounter('v8js.memory.heap.limit', {...});
const memoryHeapUsed = meter.createObservableUpDownCounter('v8js.memory.heap.used', {...});
const memoryHeapAvailable = meter.createObservableUpDownCounter('v8js.memory.heap.available_size', {...});
const memoryHeapPhysical = meter.createObservableUpDownCounter('v8js.memory.heap.physical_size', {...});

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

1. Use `Histogram` when you're interested in value statistics like _How many requests took less than 1s?_. This API is only available for push-based metrics. Example: HTTP request duration.
2. Use `Counter` for an ever-growing metric that can be summed up during analysis. Example: Number of served HTTP requests.
3. Use `UpDownCounter` for counters that can also decrease. Example: Process' memory usage.
4. Use `Gauge` when it doesn't make sense to sum up the metric during analysis. Example: Process' Uptime or Event Loop Delay.

### Attributes

When defining the attributes, it's important to consider the time series that it will generate and how they will be analyzed.

For example, consider reporting the number of open sockets using an `UpDownCounter` named `elasticsearch.client.sockets.usage`:

* ✅ We may add the attribute `elasticsearch.client.sockets.state` to differentiate between `active` and `idle` sockets.
* ❌ However, we don't want to report `open` vs. `closed` in this situation.

The reason is that, during analysis, we may want to sum all values to understand the total number of open sockets (used or not) for a specific ES client. Adding the `closed` state to the same metric will force us to always handle that state separately. 

If we needed to track the number of closed sockets over time, we should create a separate `Counter` named `elasticsearch.client.sockets.closed` for it.
