# @kbn/apm-synthtrace

`@kbn/apm-synthtrace` is a tool in technical preview to generate synthetic APM data. It is intended to be used for development and testing of the Elastic APM app in Kibana.

At a high-level, the module works by modeling APM events/metricsets with [a fluent API](https://en.wikipedia.org/wiki/Fluent_interface). The models can then be serialized and converted to Elasticsearch documents. In the future we might support APM Server as an output as well.

## Table of Contents

- [Usage](#usage)
  - [Using the Node.js module](#using-the-nodejs-module)
  - [CLI](#cli)
- [Scenarios](#scenarios)
  - [APM Scenarios](#apm-scenarios)
  - [Log Scenarios](#log-scenarios)
  - [Infrastructure Scenarios](#infrastructure-scenarios)
  - [Combined Scenarios](#combined-scenarios)
  - [Specialized Scenarios](#specialized-scenarios)
- [Advanced Usage](#advanced-usage)
- [Testing](#testing)
- [TypeScript](#typescript)

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
- `Log`: An instance of Log generating Service which supports additional helpers to customise fields like `messages`, `logLevel`
- `SyntheticsMonitor`: An instance of Synthetic monitor. For more information see [Synthetic monitoring](https://www.elastic.co/guide/en/observability/current/monitor-uptime-synthetics.html).

#### Example

```ts
import { service, timerange, toElasticsearchOutput } from '@kbn/apm-synthtrace';

const instance = service({ name: 'synth-go', environment: 'production', agentName: 'go' }).instance(
  'instance-a'
);

const from = new Date('2021-01-01T12:00:00.000Z').getTime();
const to = new Date('2021-01-01T12:00:00.000Z').getTime();

const traceEvents = timerange(from, to)
  .interval('1m')
  .rate(10)
  .flatMap((timestamp) =>
    instance
      .transaction({ transactionName: 'GET /api/product/list' })
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

`@kbn/apm-synthtrace` can also automatically generate transaction metrics, span destination metrics and transaction breakdown metrics based on the generated trace events. If we expand on the previous example:

```ts
import {
  getTransactionMetrics,
  getSpanDestinationMetrics,
  getBreakdownMetrics,
} from '@kbn/apm-synthtrace';

const esEvents = toElasticsearchOutput([
  ...traceEvents,
  ...getTransactionMetrics(traceEvents),
  ...getSpanDestinationMetrics(traceEvents),
  ...getBreakdownMetrics(traceEvents),
]);
```

### CLI

Via the CLI, you can run scenarios, either using a fixed time range or continuously generating data. Scenarios are available in [`src/platform/packages/shared/kbn-apm-synthtrace/src/scenarios/`](https://github.com/elastic/kibana/blob/main/src/platform/packages/shared/kbn-apm-synthtrace/src/scenarios/).

#### Basic Usage

For live data ingestion:

```sh
node scripts/synthtrace simple_trace.ts --target=http://admin:changeme@localhost:9200 --live
```

For a fixed time window:

```sh
node scripts/synthtrace simple_trace.ts --target=http://admin:changeme@localhost:9200 --from=now-24h --to=now
```

The script will try to automatically find bootstrapped APM indices. **If these indices do not exist, the script will exit with an error. It will not bootstrap the indices itself.**

#### Local Development

When running the CLI locally, you can simply use the following command to ingest data to a locally running Elasticsearch and Kibana instance:

```sh
node scripts/synthtrace simple_trace.ts
```

_Assuming both Elasticsearch and Kibana are running on the default localhost ports with default credentials._

#### A note when Kibana URL differs from Elasticsearch URL

If the Kibana URL differs from the Elasticsearch URL in protocol or hostname, you should explicitly pass the `--kibana` option to the CLI along with `--target`.

For example when running ES (with ssl) and Kibana (without ssl) locally in Serverless mode, it's recommended to provide both `--target` and `--kibana` options as the auto-discovered Kibana URL might not be correct in this case.
Also use `localhost` instead of `127.0.0.1` as the hostname as `127.0.0.1` will likely not work with self-signed certificates.

```sh
node scripts/synthtrace simple_trace.ts --target=https://elastic_serverless:changeme@localhost:9200 --kibana=http://elastic_serverless:changeme@localhost:5601
```

#### Using CLI for Elastic Cloud URLs

If you are ingesting data to Elastic Cloud, you can pass the `--target` option with the Elastic Cloud URL. The CLI will infer the Kibana URL from the Elasticsearch URL.
Or you can pass only `--kibana` and the CLI will infer the Elasticsearch URL from the Kibana URL. Or pass both if URLs are not in default scheme.

```sh
node scripts/synthtrace simple_trace.ts --target=https://<username>:<password>@your-cloud-cluster.kb.us-west2.gcp.elastic-cloud.com/
```

#### Using CLI with an API key

You can use a Kibana API key for authentication by passing the `--apiKey` option. When the `--apiKey` is provided, it will be used for authentication with both Elasticsearch and Kibana, taking precedence over other types of authentication.

```sh
node scripts/synthtrace simple_trace.ts --target=https://my-deployment.es.us-central1.gcp.elastic.cloud --apiKey="your-api-key"
```

### Understanding Scenario Files

Scenario files accept 3 arguments, 2 of them optional and 1 mandatory

| Arguments   | Type      | Description                                                                                                                               |
| ----------- | :-------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `generate`  | mandatory | This is the main function responsible for returning the events which will be indexed                                                      |
| `bootstrap` | optional  | In case some setup needs to be done, before the data is generated, this function provides access to all available ES Clients to play with |
| `teardown`  | optional  | In case some setup needs to be done, after all data is generated, this function provides access to all available ES Clients to play with  |

The following options are supported:

### Connection options

| Option              | Type     | Default | Description                                                                                |
| ------------------- | -------- | :------ | ------------------------------------------------------------------------------------------ |
| `--target`          | [string] |         | Elasticsearch target                                                                       |
| `--kibana`          | [string] |         | Kibana target, used to bootstrap datastreams/mappings/templates/settings                   |
| `--apiKey`          | [string] |         | API key for Kibana                                                                         |
| `--versionOverride` | [string] |         | String to be used for `observer.version`. Defauls to the version of the installed package. |

Note:

- If `--target` is not set, Synthtrace will try to detect a locally running Elasticsearch and Kibana.
- For Elastic Cloud urls, `--target` will be used to infer the location of the Cloud instance of Kibana.
- The latest version of the APM integration will automatically be installed and used for `observer.version` when ingesting APM data. In some cases,
  you'll want to use `--versionOverride` to set `observer.version` explicitly.

### Scenario options

| Option           | Type      | Default | Description                          |
| ---------------- | --------- | :------ | ------------------------------------ |
| `--from`         | [date]    | `now()` | The start of the time window         |
| `--to`           | [date]    |         | The end of the time window           |
| `--live`         | [boolean] |         | Generate and index data continuously |
| `--scenarioOpts` |           |         | Raw options specific to the scenario |

Note:

- The default `--to` is `15m`.
- You can combine `--from` and `--to` with `--live` to back-fill some data.
- To specify `--scenarioOpts` you need to use [yargs Objects syntax](https://github.com/yargs/yargs/blob/HEAD/docs/tricks.md#objects). (e.g. `--scenarioOpts.myOption=myValue` or `--scenarioOpts='{"myOption":"myValue"}'`)

### Setup options

| Option             | Type      | Default | Description                                                             |
| ------------------ | --------- | :------ | ----------------------------------------------------------------------- |
| `--clean`          | [boolean] | `false` | Clean APM data before indexing new data                                 |
| `--workers`        | [number]  |         | Amount of Node.js worker threads                                        |
| `--logLevel`       | [enum]    | `info`  | Log level (`verbose`, `debug`, `info`, `error`)                         |
| `--type`           | [string]  | `apm`   | Type of data to be generated, `log` must be passed when generating logs |
| `--concurrency`    | [number]  | `1`     | Concurrency of Elasticsearch client bulk indexing                       |
| `--uniqueIds`      | [boolean] | `false` | Generate unique ids to avoid id collisions                              |
| `--liveBucketSize` | [number]  | `1000`  | Bucket size in ms for live streaming                                    |
| `--insecure`       | [boolean] | `false` | Skip SSL certificate validation (useful for self-signed certificates)   |

## Scenarios

Synthtrace includes a wide variety of scenarios for generating different types of synthetic data. Each scenario is designed to test specific features or use cases in Kibana.

### APM Scenarios

#### `simple_trace`

Generates basic APM trace data with transactions and spans.

**Usage:**

```sh
node scripts/synthtrace simple_trace --live
node scripts/synthtrace simple_trace --from=now-24h --to=now
```

**Options:**

- `numServices` (number, default: 3): Number of services to generate
- `pipeline` (string): APM pipeline to use

**Example:**

```sh
node scripts/synthtrace simple_trace --scenarioOpts.numServices=5 --live
```

#### `distributed_trace`

Generates distributed traces across multiple services with parent-child relationships.

**Usage:**

```sh
node scripts/synthtrace distributed_trace --live
```

#### `distributed_trace_long`

Generates long-running distributed traces with deep call stacks.

**Usage:**

```sh
node scripts/synthtrace distributed_trace_long --live
```

#### `many_services`

Generates data for a large number of services.

**Usage:**

```sh
node scripts/synthtrace many_services --live
```

#### `many_instances`

Generates data for multiple instances of the same service.

**Usage:**

```sh
node scripts/synthtrace many_instances --live
```

#### `many_transactions`

Generates a high volume of transactions.

**Usage:**

```sh
node scripts/synthtrace many_transactions --live
```

#### `many_errors`

Generates a high volume of APM error documents with varied messages and types.

**Usage:**

```sh
node scripts/synthtrace many_errors --live
```

#### `many_dependencies`

Generates traces with many service dependencies.

**Usage:**

```sh
node scripts/synthtrace many_dependencies --live
```

#### `service_map`

Generates data for testing the service map visualization with predefined service relationships.

**Usage:**

```sh
node scripts/synthtrace service_map --live
```

#### `service_map_oom`

Generates data designed to test service map with out-of-memory scenarios.

**Usage:**

```sh
node scripts/synthtrace service_map_oom --live
```

#### `diagnostic_service_map`

Generates diagnostic data for service map testing.

**Usage:**

```sh
node scripts/synthtrace diagnostic_service_map --live
```

#### `high_throughput`

Generates high-throughput APM data for performance testing.

**Usage:**

```sh
node scripts/synthtrace high_throughput --live
```

#### `low_throughput`

Generates low-throughput APM data.

**Usage:**

```sh
node scripts/synthtrace low_throughput --live
```

#### `variance`

Generates data with high variance in metrics and durations.

**Usage:**

```sh
node scripts/synthtrace variance --live
```

#### `mobile`

Generates mobile APM data (iOS/Android).

**Usage:**

```sh
node scripts/synthtrace mobile --live
```

#### `trace_with_orphan_items`

Generates traces with orphan spans/transactions.

**Usage:**

```sh
node scripts/synthtrace trace_with_orphan_items --live
```

#### `trace_with_service_names_with_slashes`

Generates traces with service names containing slashes.

**Usage:**

```sh
node scripts/synthtrace trace_with_service_names_with_slashes --live
```

#### `span_links`

Generates traces with span links.

**Usage:**

```sh
node scripts/synthtrace span_links --live
```

#### `services_without_transactions`

Generates services that have metrics but no transactions.

**Usage:**

```sh
node scripts/synthtrace services_without_transactions --live
```

#### `other_bucket_group`

Generates data for testing "other" bucket grouping.

**Usage:**

```sh
node scripts/synthtrace other_bucket_group --live
```

#### `service_summary_field_version_dependent`

Generates data for testing service summary field version dependencies.

**Usage:**

```sh
node scripts/synthtrace service_summary_field_version_dependent --live
```

#### `apm_ml_anomalies`

Generates data designed to trigger ML anomaly detection.

**Usage:**

```sh
node scripts/synthtrace apm_ml_anomalies --live
```

### Log Scenarios

#### `simple_logs`

Generates simple, structured log documents with varying log levels.

**Usage:**

```sh
node scripts/synthtrace simple_logs --type=log --live
node scripts/synthtrace simple_logs --type=log --from=now-24h --to=now
```

#### `sample_logs`

Generates sample logs from various systems (Linux, Windows, Android).

**Usage:**

```sh
node scripts/synthtrace sample_logs --type=log --live
```

**Options:**

- `rpm` (number): Requests per minute
- `systems` (string|string[]): Systems to generate logs for
- `streamType` ('classic'|'wired'): Stream type

**Example:**

```sh
node scripts/synthtrace sample_logs --type=log --scenarioOpts.rpm=100 --live
```

#### `logs_and_metrics`

Generates a combination of log documents and APM metrics for several services with a fixed 50% error rate.

**Usage:**

```sh
node scripts/synthtrace logs_and_metrics --type=log --live
```

#### `logs_and_metrics_custom_error_rate`

Generates a combination of log documents and APM metrics with configurable error and debug rates.

**Usage:**

```sh
node scripts/synthtrace logs_and_metrics_custom_error_rate --live --scenarioOpts.errorRate=0.1
node scripts/synthtrace.js logs_and_metrics_custom_error_rate --live --scenarioOpts='{"errorRate":0.2,"debugRate":0.1}'
```

**Options:**

- `errorRate` (number, default: 0.5): Error rate between 0 and 1 (minimum 1% if provided)
  - `0.0` = 0% errors (all successful)
  - `0.1` = 10% errors
  - `0.5` = 50% errors
  - `1.0` = 100% errors (all failures)
- `debugRate` (number, default: 0): Debug log rate between 0 and 1 (minimum 1% if provided)
- `numServices` (number, default: 3): Number of services to generate
- `transactionsPerMinute` (number, default: 360): Total transactions per minute
- `logsPerMinute` (number): Override calculated logs per minute
- `interval` (string, default: '1m'): Time interval for rate calculation
  - `'1s'` = per second (better for live mode)
  - `'1m'` = per minute (default)
  - `'5m'` = per 5 minutes
- `isLogsDb` (boolean, default: false): Use LogsDB format

**Accuracy Notes:**

The scenario uses advanced algorithms to generate accurate log distributions:

- Automatically calculates optimal log volume based on time range to balance accuracy with performance
- Targets ~10,000 total logs to align with Kibana's default sampling behavior
- Uses the Largest Remainder Method (Hamilton method) for proportional allocation, minimizing rounding errors
- Displayed percentages may vary by ±0.1-0.5% due to Kibana's sampling when viewing large datasets, rounding during integer allocation, or statistical variance
- For custom volume requirements, override `logsPerMinute` manually

**Example:**

```sh
# Generate with 10% error rate and 5% debug rate
node scripts/synthtrace logs_and_metrics_custom_error_rate --type=log --live --scenarioOpts='{"errorRate":0.1,"debugRate":0.05}'

# Generate with custom service count and transaction rate
node scripts/synthtrace logs_and_metrics_custom_error_rate --type=log --live --scenarioOpts='{"errorRate":0.2,"numServices":10,"transactionsPerMinute":72}'
```

#### `apache_logs`

Generates Apache access and error logs.

**Usage:**

```sh
node scripts/synthtrace apache_logs --type=log --live
```

#### `kubernetes_logs`

Generates Kubernetes container and audit logs.

**Usage:**

```sh
node scripts/synthtrace kubernetes_logs --type=log --live
```

#### `unstructured_logs`

Generates unstructured log documents.

**Usage:**

```sh
node scripts/synthtrace unstructured_logs --type=log --live
```

#### `distributed_unstructured_logs`

Generates distributed unstructured logs across multiple services.

**Usage:**

```sh
node scripts/synthtrace distributed_unstructured_logs --live --scenarioOpts.distribution=uniform
```

#### `failed_logs`

Generates logs that represent failed operations.

**Usage:**

```sh
node scripts/synthtrace failed_logs --type=log --live
```

#### `degraded_logs`

Generates degraded or malformed logs.

**Usage:**

```sh
node scripts/synthtrace degraded_logs --type=log --live
```

#### `slash_logs`

Generates logs with slashes in field values.

**Usage:**

```sh
node scripts/synthtrace slash_logs --type=log --live
```

#### `simple_non_ecs_logs`

Generates simple logs that don't follow ECS (Elastic Common Schema).

**Usage:**

```sh
node scripts/synthtrace simple_non_ecs_logs --type=log --live
```

#### `simple_otel_logs`

Generates OpenTelemetry format logs.

**Usage:**

```sh
node scripts/synthtrace simple_otel_logs --type=log --live
```

#### `otel_logs_and_metrics_only`

Generates OpenTelemetry logs and metrics only.

**Usage:**

```sh
node scripts/synthtrace otel_logs_and_metrics_only --type=log --live
```

### Infrastructure Scenarios

#### `infra_hosts_with_apm_hosts`

Generates infrastructure host metrics along with APM host data.

**Usage:**

```sh
node scripts/synthtrace infra_hosts_with_apm_hosts --live
```

#### `infra_docker_containers`

Generates Docker container metrics.

**Usage:**

```sh
node scripts/synthtrace infra_docker_containers --live
```

#### `infra_k8s_containers`

Generates Kubernetes container metrics.

**Usage:**

```sh
node scripts/synthtrace infra_k8s_containers --live
```

#### `infra_aws_rds`

Generates AWS RDS infrastructure metrics.

**Usage:**

```sh
node scripts/synthtrace infra_aws_rds --live
```

### Combined Scenarios

#### `logs_traces_hosts`

Generates a comprehensive set of correlated logs, APM traces, and host metrics.

**Usage:**

```sh
node scripts/synthtrace logs_traces_hosts --type=log --live
```

**Options:**

- `numSpaces` (number, default: 1): Number of spaces
- `numServices` (number, default: 10): Number of services
- `numHosts` (number, default: 10): Number of hosts
- `numAgents` (number, default: 5): Number of agents
- `numDatasets` (number, default: 6): Number of datasets
- `datasets` (string[]): Custom list of datasets
- `degradedRatio` (number, default: 0.25): Percentage of malformed logs
- `numCustomFields` (number, default: 50): Number of custom fields per document
- `customFieldPrefix` (string, default: 'field'): Prefix for custom fields
- `logsInterval` (string, default: '1m'): Log generation interval
- `logsRate` (number, default: 1): Log generation rate
- `ingestHosts` (boolean, default: true): Whether to ingest host metrics
- `ingestTraces` (boolean, default: true): Whether to ingest traces
- `logsdb` (boolean, default: false): Use LogsDB format

**Example:**

```sh
node scripts/synthtrace logs_traces_hosts --type=log --scenarioOpts='{"numServices":20,"numHosts":50}' --live
```

### Specialized Scenarios

#### `aws_lambda`

Generates AWS Lambda function traces and metrics.

**Usage:**

```sh
node scripts/synthtrace aws_lambda --live
```

#### `azure_functions`

Generates Azure Functions traces and metrics.

**Usage:**

```sh
node scripts/synthtrace azure_functions --live
```

#### `many_otel_services`

Generates data for many OpenTelemetry services.

**Usage:**

```sh
node scripts/synthtrace many_otel_services --live
```

#### `otel_simple_trace`

Generates simple OpenTelemetry traces.

**Usage:**

```sh
node scripts/synthtrace otel_simple_trace --live
```

#### `degraded_synthetics_monitors`

Generates degraded synthetic monitor data.

**Usage:**

```sh
node scripts/synthtrace degraded_synthetics_monitors --live
```

#### `cloud_services_icons`

Generates data for testing cloud service icons.

**Usage:**

```sh
node scripts/synthtrace cloud_services_icons --live
```

#### `agent_config`

Generates data for testing agent configuration.

**Usage:**

```sh
node scripts/synthtrace agent_config --live
```

### SRE Incident Scenarios

Located in `sre_incidents/` directory:

#### `spiked_latency`

Generates data simulating a latency spike incident.

**Usage:**

```sh
node scripts/synthtrace sre_incidents/spiked_latency --live
```

#### `bad_feature_flag`

Generates data simulating a bad feature flag deployment.

**Usage:**

```sh
node scripts/synthtrace sre_incidents/bad_feature_flag --live
```

## Advanced Usage

### Custom Scenario Options

Many scenarios accept custom options via `--scenarioOpts`. Options can be passed in two formats:

**JSON format:**

```sh
node scripts/synthtrace logs_and_metrics_custom_error_rate --scenarioOpts='{"errorRate":0.1,"debugRate":0.05,"numServices":5}'
```

**Key-value format:**

```sh
node scripts/synthtrace logs_and_metrics_custom_error_rate --scenarioOpts=errorRate=0.1,debugRate=0.05,numServices=5
```

**Note:** When using the key-value format, use `--scenarioOpts=` (with equals sign) not `--scenarioOpts.` (with dot). The dot notation (`--scenarioOpts.key=value`) only works for single options and cannot be combined with comma-separated values.

### Combining Options

You can combine multiple options:

```sh
node scripts/synthtrace simple_trace --live --clean --scenarioOpts.numServices=10 --logLevel=debug
```

### Backfilling Data

You can backfill historical data and then continue with live generation:

```sh
# First, backfill 24 hours of data
node scripts/synthtrace simple_trace --from=now-24h --to=now

# Then start live generation
node scripts/synthtrace simple_trace --from=now-24h --to=now --live
```

### Performance Tuning

For high-volume scenarios, you can tune performance:

```sh
# Use multiple workers for parallel processing
node scripts/synthtrace high_throughput --workers=4 --live

# Increase concurrency for bulk indexing
node scripts/synthtrace high_throughput --concurrency=5 --live

# Adjust live bucket size
node scripts/synthtrace high_throughput --liveBucketSize=500 --live
```

### Cleaning Data

To clean existing data before generating new data:

```sh
node scripts/synthtrace simple_trace --clean --live
```

**Note:** The `--clean` option only cleans APM indices tracked by the client. For custom indices (like heartbeat), scenarios may implement their own cleanup logic.

### Date Math

You can use date math expressions for time ranges:

```sh
# Last 24 hours
node scripts/synthtrace simple_trace --from=now-24h --to=now

# Last week
node scripts/synthtrace simple_trace --from=now-7d --to=now

# Specific date range
node scripts/synthtrace simple_trace --from=2024-01-01T00:00:00Z --to=2024-01-02T00:00:00Z
```

### Log Levels

Control verbosity with log levels:

```sh
# Verbose output
node scripts/synthtrace simple_trace --logLevel=verbose --live

# Debug output
node scripts/synthtrace simple_trace --logLevel=debug --live

# Quiet mode
node scripts/synthtrace simple_trace --logLevel=error --live
```

## Testing

Run the Jest tests:

```sh
node scripts/jest --config ./src/platform/packages/shared/kbn-apm-synthtrace/jest.config.js
```

## TypeScript

Run the type checker:

```sh
node scripts/type_check.js --project src/platform/packages/shared/kbn-apm-synthtrace/tsconfig.json
```

## Troubleshooting

### Common Issues

**Issue: "Cannot find module" when running scenarios**

- Make sure you're running from the Kibana root directory
- Ensure dependencies are installed: `yarn kbn bootstrap`

**Issue: "Indices do not exist" error**

- Make sure Elasticsearch and Kibana are running
- Ensure APM indices are bootstrapped in Kibana
- Try accessing Kibana UI to ensure APM is set up

**Issue: SSL certificate errors**

- Use `--insecure` flag for self-signed certificates
- Use `localhost` instead of `127.0.0.1` as hostname

**Issue: Data not appearing in Kibana**

- Check that the correct `--type` is specified (e.g., `--type=log` for log scenarios)
- Verify indices are being created: check Elasticsearch indices
- Check Kibana index patterns are configured

**Issue: Low performance with high-volume scenarios**

- Increase `--workers` for parallel processing
- Increase `--concurrency` for bulk indexing
- Adjust `--liveBucketSize` for live streaming

### Getting Help

For more information:

- Check scenario source files in `src/platform/packages/shared/kbn-apm-synthtrace/src/scenarios/`
- Review test files in `src/platform/packages/shared/kbn-apm-synthtrace/src/test/`
- Check Kibana APM documentation
