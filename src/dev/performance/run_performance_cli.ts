/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/utils';
import Fsp from 'fs/promises';
import path from 'path';

run(
  async ({ log, flagsReader, procRunner }) => {
    async function runFunctionalTest(journey: string, phase: 'TEST' | 'WARMUP') {
      // Pass in a clean APM environemnt, so that FTR can later
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
          ['--config', path.join(journeyBasePath, journey)],
          ['--kibana-install-dir', kibanaInstallDir],
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

    async function runWarmup(journey: string) {
      try {
        process.stdout.write(`--- Running warmup ${journey}\n`);
        // Set the phase to WARMUP, this will prevent the functional test server from starting Elasticsearch, opt in to telemetry, etc.
        await runFunctionalTest(journey, 'WARMUP');
      } catch (e) {
        log.warning(`Warmup for ${journey} failed`);
        throw e;
      }
    }

    async function runTest(journey: string) {
      try {
        process.stdout.write(`--- Running test ${journey}\n`);
        process.env.TEST_PERFORMANCE_PHASE = 'TEST';
        await runFunctionalTest(journey, 'TEST');
      } catch (e) {
        log.warning(`Journey ${journey} failed. Retrying once...`);
        await runFunctionalTest(journey, 'TEST');
      }
    }

    const journeyBasePath = path.resolve(REPO_ROOT, 'x-pack/performance/journeys/');
    const kibanaInstallDir = flagsReader.requiredPath('kibana-install-dir');
    const journeys = await Fsp.readdir(journeyBasePath);
    log.info(`Found ${journeys.length} journeys to run`);

    log.info(`Setup environent`);

    for (const journey of journeys) {
      await startEs();
      await runWarmup(journey);
      await runTest(journey);
      await procRunner.stop('es');
    }
  },
  {
    flags: {
      string: ['kibana-install-dir'],
    },
  }
);
