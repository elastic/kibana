/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import datemath from '@kbn/datemath';
import yargs from 'yargs/yargs';
import { Argv } from 'yargs';
import { intervalToMs } from './utils/interval_to_ms';
import { startHistoricalDataUpload } from './utils/start_historical_data_upload';
import { startLiveDataUpload } from './utils/start_live_data_upload';
import { parseRunCliFlags } from './utils/parse_run_cli_flags';
import { getCommonServices } from './utils/get_common_services';
import { ApmSynthtraceKibanaClient } from '../lib/apm/client/apm_synthtrace_kibana_client';
import { StreamAggregator } from '../lib/stream_aggregator';
import { ServicMetricsAggregator } from '../lib/apm/aggregators/service_metrics_aggregator';

function options(y: Argv) {
  return y
    .positional('file', {
      describe: 'File that contains the trace scenario',
      demandOption: true,
      string: true,
    })
    .option('target', {
      describe: 'Elasticsearch target',
      string: true,
    })
    .option('kibana', {
      describe: 'Kibana target, used to bootstrap datastreams/mappings/templates/settings',
      string: true,
    })
    .option('apm', {
      describe:
        'APM Server target. Send data to APM over the intake API instead of generating ES documents',
      string: true,
    })
    .option('cloudId', {
      describe:
        'Provide connection information and will force APM on the cloud to migrate to run as a Fleet integration',
      string: true,
    })
    .option('local', {
      describe:
        'Shortcut during development, assumes `yarn es snapshot` and `yarn start` are running',
      boolean: true,
    })
    .option('username', {
      describe: 'Basic authentication username',
      string: true,
      default: 'elastic',
    })
    .option('password', {
      describe: 'Basic authentication password',
      string: true,
      default: 'changeme',
    })
    .option('from', {
      description: 'The start of the time window',
    })
    .option('to', {
      description: 'The end of the time window',
    })
    .option('live', {
      description: 'Generate and index data continuously',
      boolean: true,
    })
    .option('dryRun', {
      description: 'Enumerates the stream without sending events to Elasticsearch ',
      boolean: true,
    })
    .option('maxDocs', {
      description: 'The maximum number of documents we are allowed to generate',
      number: true,
    })
    .option('maxDocsConfidence', {
      description:
        'Expert setting: --maxDocs relies on accurate tpm reporting of generators setting this to >1 will widen the estimated data generation range',
      number: true,
      default: 1,
    })
    .option('numShards', {
      description:
        'Updates the component templates to update the number of primary shards, requires cloudId to be provided',
      number: true,
    })
    .option('clean', {
      describe: 'Clean APM indices before indexing new data',
      default: false,
      boolean: true,
    })
    .option('workers', {
      describe: 'Amount of Node.js worker threads',
      number: true,
    })
    .option('logLevel', {
      describe: 'Log level',
      default: 'info',
    })
    .option('forceLegacyIndices', {
      describe: 'Force writing to legacy indices',
      boolean: true,
    })
    .option('skipPackageInstall', {
      describe: 'Skip automatically installing the package',
      boolean: true,
      default: false,
    })
    .option('scenarioOpts', {
      describe: 'Options specific to the scenario',
      coerce: (arg) => {
        return arg as Record<string, any> | undefined;
      },
    })
    .option('gcpRepository', {
      describe:
        'Allows you to register a GCP repository in <client_name>:<bucket>[:base_path] format',
      string: true,
    })
    .option('streamProcessors', {
      describe: 'Specify multiple sets of stream aggregators to be included in the StreamProcessor',
      string: true,
      array: true,
      alias: 'p',
    })
    .conflicts('target', 'cloudId')
    .conflicts('kibana', 'cloudId')
    .conflicts('local', 'target')
    .conflicts('local', 'kibana')
    .conflicts('local', 'cloudId');
}

export type RunCliFlags = ReturnType<typeof options>['argv'];

export function runSynthtrace() {
  yargs(process.argv.slice(2))
    .command(
      '*',
      'Generate data and index into Elasticsearch',
      options,
      async (argv: RunCliFlags) => {
        if (argv.local) {
          argv.target = 'http://localhost:9200';
        }
        if (argv.kibana && !argv.target) {
          const url = new URL(argv.kibana);
          // super naive inference of ES target based on public kibana Cloud endpoint
          if (url.hostname.match(/\.kb\./)) {
            argv.target = argv.kibana.replace(/\.kb\./, '.es.');
          }
        }

        const runOptions = parseRunCliFlags(argv);

        const { logger, apmEsClient, apmIntakeClient } = getCommonServices(runOptions);

        const toMs = datemath.parse(String(argv.to ?? 'now'))!.valueOf();
        const to = new Date(toMs);
        const defaultTimeRange = !runOptions.maxDocs ? '15m' : '520w';
        const fromMs = argv.from
          ? datemath.parse(String(argv.from))!.valueOf()
          : toMs - intervalToMs(defaultTimeRange);
        const from = new Date(fromMs);

        const live = argv.live;

        if (runOptions.dryRun) {
          await startHistoricalDataUpload(apmEsClient, logger, runOptions, from, to, '8.0.0');
          return;
        }

        // we need to know the running version to generate events that satisfy the min version requirements
        let version = await apmEsClient.runningVersion();
        logger.info(`Discovered Elasticsearch running version: ${version}`);
        version = version.replace('-SNAPSHOT', '');

        // We automatically set up managed APM either by migrating on cloud or installing the package locally
        if (runOptions.cloudId || argv.local || argv.kibana) {
          const kibanaClient = new ApmSynthtraceKibanaClient(logger);
          if (runOptions.cloudId) {
            await kibanaClient.migrateCloudToManagedApm(
              runOptions.cloudId,
              runOptions.username,
              runOptions.password
            );
          } else {
            let kibanaUrl: string | null = argv.kibana ?? null;
            if (argv.local) {
              kibanaUrl = await kibanaClient.discoverLocalKibana();
            }
            if (!kibanaUrl) throw Error('kibanaUrl could not be determined');
            if (!argv.skipPackageInstall) {
              await kibanaClient.installApmPackage(
                kibanaUrl,
                version,
                runOptions.username,
                runOptions.password
              );
            }
          }
        }

        if (runOptions.cloudId && runOptions.numShards && runOptions.numShards > 0) {
          await apmEsClient.updateComponentTemplates(runOptions.numShards);
        }
        const aggregators: StreamAggregator[] = [];
        const registry = new Map<string, () => StreamAggregator[]>([
          ['service', () => [new ServicMetricsAggregator()]],
        ]);
        if (runOptions.streamProcessors && runOptions.streamProcessors.length > 0) {
          for (const processorName of runOptions.streamProcessors) {
            const factory = registry.get(processorName);
            if (factory) {
              aggregators.push(...factory());
            } else {
              throw new Error(
                `No processor named ${processorName} configured on known processor registry`
              );
            }
          }
        }
        if (argv.clean) {
          if (argv.apm) {
            await apmEsClient.clean(['metrics-apm.service-*']);
          } else {
            await apmEsClient.clean(aggregators.map((a) => a.getDataStreamName() + '-*'));
          }
        }
        if (runOptions.gcpRepository) {
          await apmEsClient.registerGcpRepository(runOptions.gcpRepository);
        }

        logger.info(
          `Starting data generation\n: ${JSON.stringify(
            {
              ...runOptions,
              from: from.toISOString(),
              to: to.toISOString(),
            },
            null,
            2
          )}`
        );

        for (const aggregator of aggregators) await apmEsClient.createDataStream(aggregator);

        if (runOptions.maxDocs !== 0)
          await startHistoricalDataUpload(apmEsClient, logger, runOptions, from, to, version);

        if (live) {
          await startLiveDataUpload(apmEsClient, apmIntakeClient, logger, runOptions, to, version);
        }
      }
    )
    .parse();
}
