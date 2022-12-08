/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createFlagError } from '@kbn/dev-cli-errors';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/utils';
import fs from 'fs';
import path from 'path';

const JOURNEY_BASE_PATH = 'x-pack/performance/journeys';

export interface Journey {
  name: string;
  path: string;
}

run(
  async ({ log, flagsReader, procRunner }) => {
    const skipWarmup = flagsReader.boolean('skip-warmup');
    const journeyPath = flagsReader.path('journey-path');
    const kibanaInstallDir = flagsReader.path('kibana-install-dir');

    if (kibanaInstallDir && !fs.existsSync(kibanaInstallDir)) {
      throw createFlagError('--kibana-install-dir must be an existing directory');
    }

    if (journeyPath && !fs.existsSync(journeyPath)) {
      throw createFlagError('--journey-path must be an existing path');
    }

    let journeys: Journey[] = [];

    if (journeyPath) {
      journeys = [{ name: path.parse(journeyPath).name, path: journeyPath }];
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
        await startEs();
        if (!skipWarmup) {
          await runWarmup(journey, kibanaInstallDir);
        }
        await runTest(journey, kibanaInstallDir);
      } catch (e) {
        log.error(e);
        failedJourneys.push(journey.name);
      } finally {
        await procRunner.stop('es');
      }
    }

    async function runFunctionalTest(
      configPath: string,
      phase: 'TEST' | 'WARMUP',
      kibanaBuildDir: string | undefined
    ) {
      // Pass in a clean APM environment, so that FTR can later
      // set it's own values.
      const cleanApmEnv = {
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: undefined,
        ELASTIC_APM_SERVER_URL: undefined,
        ELASTIC_APM_SECRET_TOKEN: undefined,
        ELASTIC_APM_ACTIVE: undefined,
        ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: undefined,
        ELASTIC_APM_GLOBAL_LABELS: undefined,
      };

      await procRunner.run('functional-tests', {
        cmd: 'node',
        args: [
          'scripts/functional_tests',
          ['--config', configPath],
          kibanaBuildDir ? ['--kibana-install-dir', kibanaBuildDir] : [],
          '--debug',
          '--bail',
        ].flat(),
        cwd: REPO_ROOT,
        wait: true,
        env: {
          TEST_PERFORMANCE_PHASE: phase,
          TEST_ES_URL: 'http://elastic:changeme@localhost:9200',
          TEST_ES_DISABLE_STARTUP: 'true',
          ...cleanApmEnv,
        },
      });
    }

    async function startEs() {
      process.stdout.write(`--- Starting ES\n`);
      await procRunner.run('es', {
        cmd: 'node',
        args: ['scripts/es', 'snapshot'],
        cwd: REPO_ROOT,
        wait: /kbn\/es setup complete/,
      });

      log.info(`✅ ES is ready and will run in the background`);
    }

    async function runWarmup(journey: Journey, kibanaBuildDir: string | undefined) {
      try {
        process.stdout.write(`--- Running warmup: ${journey.name}\n`);
        // Set the phase to WARMUP, this will prevent the functional test server from starting Elasticsearch, opt in to telemetry, etc.
        await runFunctionalTest(journey.path, 'WARMUP', kibanaBuildDir);
      } catch (e) {
        log.warning(`Warmup for ${journey.name} failed`);
        throw e;
      }
    }

    async function runTest(journey: Journey, kibanaBuildDir: string | undefined) {
      try {
        process.stdout.write(`--- Running ${journey.name}\n`);
        await runFunctionalTest(journey.path, 'TEST', kibanaBuildDir);
      } catch (e) {
        log.warning(`Journey ${journey.name} failed. Retrying once...`);
        await runFunctionalTest(journey.path, 'TEST', kibanaBuildDir);
      }
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
      --journey-path=path           Define a path for single user journey that should be executed
                                    All journeys from '${JOURNEY_BASE_PATH}' are executed by default
      --skip-warmup                 Journey will be executed without warmup (TEST phase only)
    `,
    },
  }
);
