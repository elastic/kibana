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

function setupEnv() {
  process.env.TEST_ES_URL = 'http://elastic:changeme@localhost:9200';
  process.env.TEST_ES_DISABLE_STARTUP = 'true';
}

function cleanupEnv() {
  delete process.env.ELASTIC_APM_TRANSACTION_SAMPLE_RATE;
  delete process.env.ELASTIC_APM_SERVER_URL;
  delete process.env.ELASTIC_APM_SECRET_TOKEN;
  delete process.env.ELASTIC_APM_ACTIVE;
  delete process.env.ELASTIC_APM_CONTEXT_PROPAGATION_ONLY;
  delete process.env.ELASTIC_APM_ACTIVE;
  delete process.env.ELASTIC_APM_SERVER_URL;
  delete process.env.ELASTIC_APM_SECRET_TOKEN;
  delete process.env.ELASTIC_APM_GLOBAL_LABELS;
  delete process.env.TEST_ES_URL;
  delete process.env.TEST_ES_DISABLE_STARTUP;
  delete process.env.TEST_PERFORMANCE_PHASE;
}

run(
  async ({ log, flagsReader, procRunner }) => {
    async function runFunctionalTest(journey: string) {
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
        process.env.TEST_PERFORMANCE_PHASE = 'WARMUP';
        await runFunctionalTest(journey);
      } catch (e) {
        log.warning(`Warmup for ${journey} failed`);
        throw e;
      }
    }

    async function runTest(journey: string) {
      try {
        process.stdout.write(`--- Running test ${journey}\n`);
        process.env.TEST_PERFORMANCE_PHASE = 'TEST';
        await runFunctionalTest(journey);
      } catch (e) {
        log.warning(`Journey ${journey} failed. Retrying once...`);
        await runFunctionalTest(journey);
      }
    }

    const journeyBasePath = 'x-pack/performance/journeys/';
    const kibanaInstallDir = flagsReader.requiredPath('kibana-install-dir');
    const journeys = await Fsp.readdir(journeyBasePath);
    const warmupIndex = journeys.indexOf('warmup.ts');
    // const warmupJourney = journeys[warmupIndex];
    journeys.splice(warmupIndex, 1);

    log.info(`Found ${journeys.length} journeys to run`);

    setupEnv();

    log.info(`Setup environent`);

    for (const journey of journeys) {
      await startEs();
      await runWarmup(journey);
      await runTest(journey);
      await procRunner.stop('es');
    }

    cleanupEnv();
  },
  {
    flags: {
      string: ['kibana-install-dir'],
    },
  }
);
