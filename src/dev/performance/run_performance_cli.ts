/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import fs from 'fs';
import path from 'path';

const JOURNEY_BASE_PATH = 'x-pack/performance/journeys';

export interface Journey {
  name: string;
  path: string;
}

interface TestRunProps {
  phase: 'TEST' | 'WARMUP';
  journey: Journey;
  kibanaInstallDir: string | undefined;
  logsDir: string;
}

run(
  async ({ log, flagsReader, procRunner }) => {
    const skipWarmup = flagsReader.boolean('skip-warmup');
    const kibanaInstallDir = flagsReader.path('kibana-install-dir');
    const journeyPath = flagsReader.path('journey-path');

    if (kibanaInstallDir && !fs.existsSync(kibanaInstallDir)) {
      throw createFlagError('--kibana-install-dir must be an existing directory');
    }

    if (journeyPath && !fs.existsSync(journeyPath)) {
      throw createFlagError('--journey-path must be an existing path');
    }

    let journeys: Journey[] = [];

    if (journeyPath) {
      journeys = fs.statSync(journeyPath).isDirectory()
        ? fs.readdirSync(journeyPath).map((fileName) => {
            return { name: fileName, path: path.resolve(journeyPath, fileName) };
          })
        : [{ name: path.parse(journeyPath).name, path: journeyPath }];
    } else {
      const journeyBasePath = path.resolve(REPO_ROOT, JOURNEY_BASE_PATH);
      journeys = fs.readdirSync(journeyBasePath).map((name) => {
        return { name, path: path.join(journeyBasePath, name) };
      });
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
        await startEs(logsDir);
        if (!skipWarmup) {
          process.stdout.write(`--- Running warmup: ${journey.name}\n`);
          // Set the phase to WARMUP, this will prevent the FTR from starting Kibana with opt-in telemetry and save logs to file
          await runFunctionalTest({
            journey,
            phase: 'WARMUP',
            kibanaInstallDir,
            logsDir,
          });
        }
        process.stdout.write(`--- Running actual test: ${journey.name}\n`);
        await runFunctionalTest({ journey, phase: 'TEST', kibanaInstallDir, logsDir });
      } catch (e) {
        log.error(e);
        failedJourneys.push(journey.name);
      } finally {
        await procRunner.stop('es');
      }
    }

    async function runFunctionalTest(props: TestRunProps) {
      const { journey, phase, kibanaInstallDir, logsDir } = props;
      await procRunner.run('functional-tests', {
        cmd: 'node',
        args: [
          'scripts/functional_tests',
          ['--config', journey.path],
          kibanaInstallDir ? ['--kibana-install-dir', kibanaInstallDir] : [],
          // save Kibana logs for WARMUP phase in file
          phase === 'WARMUP' ? ['--writeLogsToPath', logsDir] : [],
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
          TEST_PERFORMANCE_PHASE: phase,
          TEST_ES_URL: 'http://elastic:changeme@localhost:9200',
          TEST_ES_DISABLE_STARTUP: 'true',
        },
      });
    }

    async function startEs(logsDir: string) {
      process.stdout.write(`Starting ES\n`);
      await procRunner.run('es', {
        cmd: 'node',
        args: [
          'scripts/es',
          'snapshot',
          '--license=trial',
          // Temporarily disabling APM
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

    if (failedJourneys.length > 0) {
      throw new Error(`${failedJourneys.length} journeys failed: ${failedJourneys.join(',')}`);
    }
  },
  {
    flags: {
      string: ['kibana-install-dir', 'journey-path'],
      boolean: ['skip-warmup'],
      help: `
      --kibana-install-dir=dir      Run Kibana from existing install directory instead of from source
      --journey-path=path           Define path to performance journey or directory with multiple journeys
                                    that should be executed. '${JOURNEY_BASE_PATH}' is run by default
      --skip-warmup                 Journey will be executed without warmup (TEST phase only)
    `,
    },
  }
);
