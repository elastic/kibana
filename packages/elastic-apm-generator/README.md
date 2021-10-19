# @elastic/apm-generator

`@elastic/apm-generator` is an experimental tool to generate synthetic APM data. It is intended to be used for development and testing of the Elastic APM app in Kibana. 

At a high-level, the module works by modeling APM events/metricsets with [a fluent API](https://en.wikipedia.org/wiki/Fluent_interface). The models can then be serialized and converted to Elasticsearch documents. In the future we might support APM Server as an output as well.

## Usage

This section assumes that you've installed Kibana's dependencies by running `yarn kbn bootstrap` in the repository's root folder.

This library can currently be used in two ways:

- Imported as a Node.js module, for instance to be used in Kibana's functional test suite.
- With a command line interface, to index data based on some example scenarios.

### Using the Node.js module

#### Concepts

- `Service`: a logical grouping for a monitored service. A `Service` object contains fields like `service.name`, `service.environment` and `agent.name`.
- `Instance`: a single instance of a monitored service. E.g., the workload for a monitored service might be spread across multiple containers. An `Instance` object contains fields like `service.node.name` and `container.id`.
- `Timerange`: an object that will return an array of timestamps based on an interval and a rate. These timestamps can be used to generate events/metricsets.
- `Transaction`, `Span`, `APMError` and `Metricset`: events/metricsets that occur on an instance. For more background, see the [explanation of the APM data model](https://www.elastic.co/guide/en/apm/get-started/7.15/apm-data-model.html)


#### Example

```ts
import { service, timerange, toElasticsearchOutput } from '@elastic/apm-generator';

const instance = service('synth-go', 'production', 'go')
  .instance('instance-a');

const from = new Date('2021-01-01T12:00:00.000Z').getTime();
const to = new Date('2021-01-01T12:00:00.000Z').getTime() - 1;

const traceEvents = timerange(from, to)
  .interval('1m')
  .rate(10)
  .flatMap(timestamp => instance.transaction('GET /api/product/list')
    .timestamp(timestamp)
    .duration(1000)
    .success()
    .children(
      instance.span('GET apm-*/_search', 'db', 'elasticsearch')
        .timestamp(timestamp + 50)
        .duration(900)
        .destination('elasticsearch')
        .success()
    ).serialize()
  );

const metricsets = timerange(from, to)
  .interval('30s')
  .rate(1)
  .flatMap(timestamp => instance.appMetrics({
    'system.memory.actual.free': 800,
    'system.memory.total': 1000,
    'system.cpu.total.norm.pct': 0.6,
    'system.process.cpu.total.norm.pct': 0.7,
  }).timestamp(timestamp)
    .serialize()
  );

const esEvents = toElasticsearchOutput(traceEvents.concat(metricsets));
```

#### Generating metricsets

`@elastic/apm-generator` can also automatically generate transaction metrics, span destination metrics and transaction breakdown metrics based on the generated trace events. If we expand on the previous example:

```ts
import { getTransactionMetrics, getSpanDestinationMetrics, getBreakdownMetrics } from '@elastic/apm-generator';

const esEvents = toElasticsearchOutput([
  ...traceEvents,
  ...getTransactionMetrics(traceEvents),
  ...getSpanDestinationMetrics(traceEvents),
  ...getBreakdownMetrics(traceEvents)
]);
```

### CLI

Via the CLI, you can upload examples. The supported examples are listed in `src/lib/es.ts`. A `--target` option that specifies the Elasticsearch URL should be defined when running the `example` command. Here's an example:

`$ node packages/elastic-apm-generator/src/scripts/es.js example simple-trace --target=http://admin:changeme@localhost:9200`

The following options are supported:
- `to`: the end of the time range, in ISO format. By default, the current time will be used.
- `from`: the start of the time range, in ISO format. By default, `to` minus 15 minutes will be used.
- `apm-server-version`: the version used in the index names bootstrapped by APM Server, e.g. `7.16.0`. __If these indices do not exist, the script will exit with an error. It will not bootstrap the indices itself.__

