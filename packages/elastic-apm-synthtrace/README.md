# @elastic/apm-synthtrace

`@elastic/apm-synthtrace` is a tool in technical preview to generate synthetic APM data. It is intended to be used for development and testing of the Elastic APM app in Kibana.

At a high-level, the module works by modeling APM events/metricsets with [a fluent API](https://en.wikipedia.org/wiki/Fluent_interface). The models can then be serialized and converted to Elasticsearch documents. In the future we might support APM Server as an output as well.

## Usage

This section assumes that you've installed Kibana's dependencies by running `yarn kbn bootstrap` in the repository's root folder.

This library can currently be used in two ways:

- Imported as a Node.js module, for instance to be used in Kibana's functional test suite.
- With a command line interface, to index data based on a specified scenario.

### Using the Node.js module

#### Concepts

- `Service`: a logical grouping for a monitored service. A `Service` object contains fields like `service.name`, `service.environment` and `agent.name`.
- `Instance`: a single instance of a monitored service. E.g., the workload for a monitored service might be spread across multiple containers. An `Instance` object contains fields like `service.node.name` and `container.id`.
- `Timerange`: an object that will return an array of timestamps based on an interval and a rate. These timestamps can be used to generate events/metricsets.
- `Transaction`, `Span`, `APMError` and `Metricset`: events/metricsets that occur on an instance. For more background, see the [explanation of the APM data model](https://www.elastic.co/guide/en/apm/get-started/7.15/apm-data-model.html)

#### Example

```ts
import { service, timerange, toElasticsearchOutput } from '@elastic/apm-synthtrace';

const instance = service('synth-go', 'production', 'go').instance('instance-a');

const from = new Date('2021-01-01T12:00:00.000Z').getTime();
const to = new Date('2021-01-01T12:00:00.000Z').getTime();

const traceEvents = timerange(from, to)
  .interval('1m')
  .rate(10)
  .flatMap((timestamp) =>
    instance
      .transaction('GET /api/product/list')
      .timestamp(timestamp)
      .duration(1000)
      .success()
      .children(
        instance
          .span('GET apm-*/_search', 'db', 'elasticsearch')
          .timestamp(timestamp + 50)
          .duration(900)
          .destination('elasticsearch')
          .success()
      )
      .serialize()
  );

const metricsets = timerange(from, to)
  .interval('30s')
  .rate(1)
  .flatMap((timestamp) =>
    instance
      .appMetrics({
        'system.memory.actual.free': 800,
        'system.memory.total': 1000,
        'system.cpu.total.norm.pct': 0.6,
        'system.process.cpu.total.norm.pct': 0.7,
      })
      .timestamp(timestamp)
      .serialize()
  );

const esEvents = toElasticsearchOutput(traceEvents.concat(metricsets));
```

#### Generating metricsets

`@elastic/apm-synthtrace` can also automatically generate transaction metrics, span destination metrics and transaction breakdown metrics based on the generated trace events. If we expand on the previous example:

```ts
import {
  getTransactionMetrics,
  getSpanDestinationMetrics,
  getBreakdownMetrics,
} from '@elastic/apm-synthtrace';

const esEvents = toElasticsearchOutput([
  ...traceEvents,
  ...getTransactionMetrics(traceEvents),
  ...getSpanDestinationMetrics(traceEvents),
  ...getBreakdownMetrics(traceEvents),
]);
```

### CLI

Via the CLI, you can upload scenarios, either using a fixed time range or continuously generating data. Some examples are available in in `src/scripts/examples`. Here's an example for live data:

`$ node packages/elastic-apm-synthtrace/src/scripts/run packages/elastic-apm-synthtrace/src/scripts/examples/01_simple_trace.ts --target=http://admin:changeme@localhost:9200 --live`

For a fixed time window:
`$ node packages/elastic-apm-synthtrace/src/scripts/run packages/elastic-apm-synthtrace/src/scripts/examples/01_simple_trace.ts --target=http://admin:changeme@localhost:9200 --from=now-24h --to=now`

The script will try to automatically find bootstrapped APM indices. **If these indices do not exist, the script will exit with an error. It will not bootstrap the indices itself.**

The following options are supported:

### Connection options

| Option                 | Type      | Default    | Description                                                                                                                                |
|------------------------|-----------|:-----------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `--target`             | [string]  |            | Elasticsearch target                                                                                                                       |
| `--kibana`             | [string]  |            | Kibana target, used to bootstrap datastreams/mappings/templates/settings                                                                   |
| `--cloudId`            | [string]  |            | Provide connection information and will force APM on the cloud to migrate to run as a Fleet integration                                    |
| `--local`              | [boolean] |            | Shortcut during development, assumes `yarn es snapshot` and `yarn start` are running                                                       |
| `--username`           | [string]  | `elastic`  | Basic authentication username                                                                                                              |
| `--password`           | [string]  | `changeme` | Basic authentication password                                                                                                              |

Note: 
- If you only specify `--target` Synthtrace can not automatically setup APM.  
- If you specify both `--target` and `--kibana` the tool will automatically attempt to install the appropriate APM package   
- For Cloud its easiest to specify `--cloudId` as it will unpack the ES/Kibana targets and migrate cloud over to managed APM automatically.
- If you only specify `--kibana` and it's using a cloud hostname a very naive `--target` to Elasticsearch will be inferred.

### Scenario options
| Option                 | Type      | Default | Description                                                                                                                                |
|------------------------|-----------|:--------|--------------------------------------------------------------------------------------------------------------------------------------------|
| `--from`               | [date]    | `now()` | The start of the time window                                                                                                               |
| `--to`                 | [date]    |         | The end of the time window                                                                                                                 |
| `--maxDocs`            | [number]  |         | The maximum number of documents we are allowed to generate                                                                                 |
| `--maxDocsConfidence`  | [number]  | `1`     | Expert setting: --maxDocs relies on accurate tpm reporting of generators setting this to >1 will widen the estimated data generation range |
| `--live`               | [boolean] |         | Generate and index data continuously                                                                                                       |
| `--dryRun`             | [boolean] |         | Enumerates the stream without sending events to Elasticsearch                                                                              |
| `--scenarioOpts`       |           |         | Raw options specific to the scenario                                                                                                       |
| `--forceLegacyIndices` | [boolean] | `false` | Force writing to legacy indices                                                                                                            |

Note:
- The default `--to` is `15m` unless `--maxDocs` is specified in which case `--to` is calculated based on the scenario's TPM.


### Setup options
| Option                 | Type      | Default    | Description                                                                                             |
|------------------------|-----------|:-----------|---------------------------------------------------------------------------------------------------------|
| `--numShards`          | [number]  |            | Updates the component templates to update the number of primary shards, requires cloudId to be provided |
| `--clean`              | [boolean] | `false`    | Clean APM data before indexing new data                                                                 |
| `--workers`            | [number]  |            | Amount of Node.js worker threads                                                                        |
| `--logLevel`           | [enum]    | `info`     | Log level                                                                                               |
| `--gcpRepository`      | [string]  |            | Allows you to register a GCP repository in <client_name>:<bucket>[:base_path] format                    |

