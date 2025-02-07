/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { ProcRunner } from '@kbn/dev-proc-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import { ToolingLog } from '@kbn/tooling-log';
import fs from 'fs';
import path from 'path';

const JOURNEY_BASE_PATH = 'x-pack/performance/journeys_e2e';

export interface Journey {
  name: string;
  path: string;
}

interface EsRunProps {
  procRunner: ProcRunner;
  log: ToolingLog;
  logsDir?: string;
}

interface TestRunProps extends EsRunProps {
  journey: Journey;
  phase: 'TEST' | 'WARMUP';
  ingestEsData: boolean;
  kibanaInstallDir: string | undefined;
}

interface JourneyTargetGroups {
  [key: string]: string[];
}

const journeyTargetGroups: JourneyTargetGroups = {
  kibanaStartAndLoad: ['login'],
  crud: ['tags_listing_page', 'dashboard_listing_page'],
  dashboard: ['ecommerce_dashboard', 'data_stress_test_lens', 'flight_dashboard'],
  discover: ['many_fields_discover', 'many_fields_discover_esql'],
  maps: ['ecommerce_dashboard_map_only'],
  ml: ['aiops_log_rate_analysis', 'many_fields_transform', 'tsdb_logs_data_visualizer'],
  esql: ['many_fields_discover_esql', 'web_logs_dashboard_esql'],
  http2: ['data_stress_test_lens_http2', 'ecommerce_dashboard_http2'],
};

const readFilesRecursively = (dir: string, callback: Function) => {
  const files = fs.readdirSync(dir);
  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      readFilesRecursively(filePath, callback);
    } else if (stat.isFile()) {
      callback(filePath);
    }
  });
};

const getAllJourneys = (dir: string) => {
  const journeys: Journey[] = [];

  readFilesRecursively(dir, (filePath: string) =>
    journeys.push({
      name: path.parse(filePath).name,
      path: path.resolve(dir, filePath),
    })
  );

  return journeys;
};

const getJourneysToRun = ({ journeyPath, group }: { journeyPath?: string; group?: string }) => {
  if (group && typeof group === 'string') {
    if (!(group in journeyTargetGroups)) {
      throw createFlagError(`Group '${group}' is not defined, try again`);
    }

    const fileNames = journeyTargetGroups[group];
    const dir = path.resolve(REPO_ROOT, JOURNEY_BASE_PATH);

    return getAllJourneys(dir).filter((journey) => fileNames.includes(journey.name));
  }

  if (journeyPath && !fs.existsSync(journeyPath)) {
    throw createFlagError('--journey-path must be an existing path');
  }

  if (journeyPath && fs.statSync(journeyPath).isFile()) {
    return [{ name: path.parse(journeyPath).name, path: journeyPath }];
  } else {
    // default dir is x-pack/performance/journeys_e2e
    const dir = journeyPath ?? path.resolve(REPO_ROOT, JOURNEY_BASE_PATH);
    return getAllJourneys(dir);
  }
};

async function startEs(props: EsRunProps) {
  const { procRunner, log, logsDir } = props;
  await procRunner.run('es', {
    cmd: 'node',
    args: [
      'scripts/es',
      'snapshot',
      '--license=trial',
      // Temporarily disabling APM because the token needs to be added to the keystore
      // and cannot be set via command line
      // ...(JOURNEY_APM_CONFIG.active
      //   ? [
      //       '-E',
      //       'tracing.apm.enabled=true',
      //       '-E',
      //       'tracing.apm.agent.transaction_sample_rate=1.0',
      //       '-E',
      //       `tracing.apm.agent.server_url=${JOURNEY_APM_CONFIG.serverUrl}`,
      //       '-E',
      //       `tracing.apm.agent.secret_token=${JOURNEY_APM_CONFIG.secretToken}`,
      //       '-E',
      //       `tracing.apm.agent.environment=${JOURNEY_APM_CONFIG.environment}`,
      //     ]
      //   : []),
      `--writeLogsToPath=${logsDir}/es-cluster.log`,
    ],
    cwd: REPO_ROOT,
    wait: /kbn\/es setup complete/,
  });

  log.info(`✅ ES is ready and will run in the background`);
}

async function runFunctionalTest(props: TestRunProps) {
  const { procRunner, journey, phase, kibanaInstallDir, logsDir, ingestEsData } = props;
  await procRunner.run('functional-tests', {
    cmd: 'node',
    args: [
      'scripts/functional_tests',
      ['--config', journey.path],
      kibanaInstallDir ? ['--kibana-install-dir', kibanaInstallDir] : [],
      // save Kibana logs in file instead of console output; only for "warmup" phase
      logsDir ? ['--writeLogsToPath', logsDir] : [],
      '--debug',
      '--bail',
    ].flat(),
    cwd: REPO_ROOT,
    wait: true,
    env: {
      // Reset all the ELASTIC APM env vars to undefined, FTR config might set it's own values.
      ...Object.fromEntries(
        Object.keys(process.env).flatMap((k) =>
          k.startsWith('ELASTIC_APM_') ? [[k, undefined]] : []
        )
      ),
      ELASTIC_APM_ENVIRONMENT: process.env.ELASTIC_APM_ENVIRONMENT,
      ELASTIC_APM_SERVICE_NAME: process.env.ELASTIC_APM_SERVICE_NAME,
      TEST_PERFORMANCE_PHASE: phase,
      TEST_ES_URL: 'http://elastic:changeme@localhost:9200',
      TEST_ES_DISABLE_STARTUP: 'true',
      TEST_INGEST_ES_DATA: ingestEsData.toString(),
    },
  });
}

run(
  async ({ log, flagsReader, procRunner }) => {
    const skipWarmup = flagsReader.boolean('skip-warmup');
    const kibanaInstallDir = flagsReader.path('kibana-install-dir');
    const journeyPath = flagsReader.path('journey-path');
    const group = flagsReader.string('group');

    if (group && journeyPath) {
      throw createFlagError('--group and --journeyPath cannot be used simultaneously');
    }

    if (kibanaInstallDir && !fs.existsSync(kibanaInstallDir)) {
      throw createFlagError('--kibana-install-dir must be an existing directory');
    }

    const journeys = getJourneysToRun({ journeyPath, group });

    if (journeys.length === 0) {
      throw new Error('No journeys found');
    }

    log.info(
      `Found ${journeys.length} journeys to run: ${JSON.stringify(journeys.map((j) => j.name))}`
    );

    const failedJourneys = [];

    for (const journey of journeys) {
      try {
        // create folder to store ES/Kibana server logs
        const logsDir = path.resolve(REPO_ROOT, `.ftr/journey_server_logs/${journey.name}`);
        fs.mkdirSync(logsDir, { recursive: true });
        process.stdout.write(`--- Running journey: ${journey.name} [start ES, warmup run]\n`);
        await startEs({ procRunner, log, logsDir });
        if (!skipWarmup) {
          // Set the phase to WARMUP, this will prevent the FTR from starting Kibana with opt-in telemetry and save logs to file
          await runFunctionalTest({
            procRunner,
            log,
            journey,
            phase: 'WARMUP',
            kibanaInstallDir,
            logsDir,
            ingestEsData: true,
          });
        }
        process.stdout.write(`--- Running journey: ${journey.name} [collect metrics]\n`);
        await runFunctionalTest({
          procRunner,
          log,
          journey,
          phase: 'TEST',
          kibanaInstallDir,
          ingestEsData: skipWarmup, // if warmup was skipped, we need to ingest data as part of TEST phase
        });
      } catch (e) {
        log.error(e);
        failedJourneys.push(journey.name);
      } finally {
        await procRunner.stop('es');
      }
    }

    if (failedJourneys.length > 0) {
      throw new Error(`${failedJourneys.length} journeys failed: ${failedJourneys.join(',')}`);
    }
  },
  {
    flags: {
      string: ['kibana-install-dir', 'journey-path', 'group'],
      boolean: ['skip-warmup'],
      help: `
      --kibana-install-dir=dir      Run Kibana from existing install directory instead of from source
      --journey-path=path           Define path to performance journey or directory with multiple journeys
                                    that should be executed. '${JOURNEY_BASE_PATH}' is run by default
      --skip-warmup                 Journey will be executed without warmup (TEST phase only)
      --group                       Run subset of journeys, defined in the specified group
    `,
    },
  }
);
