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

// These "secret" values are intentionally written in the source. We would make the APM server accept anonymous traffic if we could
const APM_SERVER_URL = 'https://kibana-ops-e2e-perf.apm.us-central1.gcp.cloud.es.io:443';
const APM_PUBLIC_TOKEN = 'CTs9y3cvcfq13bQqsB';
const apmEnv = {
  ELASTIC_APM_ACTIVE: 'true',
  ELASTIC_APM_SERVER_URL: APM_SERVER_URL,
  ELASTIC_APM_SECRET_TOKEN: APM_PUBLIC_TOKEN,
  ELASTIC_APM_TRANSACTION_SAMPLE_RATE: "1.0",
};

run(
  async ({ log, flagsReader, procRunner }) => {
    async function runFunctionalTest(journey: string, phase: 'TEST' | 'WARMUP') {

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
          ...apmEnv,
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
        env: apmEnv,
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

    const failedJourneys = [];

    for (const journey of journeys) {
      try {
        await startEs();
        await runWarmup(journey);
        await runTest(journey);
      } catch (e) {
        log.error(e);
        failedJourneys.push(journey);
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
      string: ['kibana-install-dir'],
    },
  }
);
