/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/utils';
import fs from 'fs';
import path from 'path';

run(
  async ({ log, flagsReader, procRunner }) => {
    async function runScalabilityJourney(journeyConfigPath: string) {
      // Pass in a clean APM environment, so that FTR can later
      // set it's own values.
      const cleanApmEnv = {
        ELASTIC_APM_ACTIVE: undefined,
        ELASTIC_APM_BREAKDOWN_METRICS: undefined,
        ELASTIC_APM_CONTEXT_PROPAGATION_ONLY: undefined,
        ELASTIC_APM_CAPTURE_SPAN_STACK_TRACES: undefined,
        ELASTIC_APM_ENVIRONMENT: undefined,
        ELASTIC_APM_GLOBAL_LABELS: undefined,
        ELASTIC_APM_MAX_QUEUE_SIZE: undefined,
        ELASTIC_APM_METRICS_INTERVAL: undefined,
        ELASTIC_APM_SERVER_URL: undefined,
        ELASTIC_APM_SECRET_TOKEN: undefined,
        ELASTIC_APM_TRANSACTION_SAMPLE_RATE: undefined,
      };

      await procRunner.run('scalability-tests', {
        cmd: 'node',
        args: [
          'scripts/functional_tests',
          ['--config', 'x-pack/test/scalability/config.ts'],
          ['--kibana-install-dir', kibanaInstallDir],
          '--debug',
          '--logToFile',
          '--bail',
        ].flat(),
        cwd: REPO_ROOT,
        wait: true,
        env: {
          ...cleanApmEnv,
          SCALABILITY_JOURNEY_PATH: journeyConfigPath, // Input file for Gatling test runner
          KIBANA_DIR: REPO_ROOT, // Gatling test runner use it to find kbn/es archives
        },
      });
    }

    const kibanaInstallDir = flagsReader.requiredPath('kibana-install-dir');
    const journeyConfigPath = flagsReader.requiredPath('journey-config-path');
    const journeys = fs.statSync(journeyConfigPath).isDirectory()
      ? fs
          .readdirSync(journeyConfigPath)
          .filter((fileName) => path.extname(fileName) === '.json')
          .map((fileName) => path.resolve(journeyConfigPath, fileName))
      : [journeyConfigPath];

    log.info(`Found ${journeys.length} journeys to run:\n${JSON.stringify(journeys)}`);

    const failedJourneys = [];

    for (const journey of journeys) {
      try {
        process.stdout.write(`--- Running scalability journey: ${journey}\n`);
        await runScalabilityJourney(journey);
      } catch (e) {
        log.error(e);
        failedJourneys.push(journey);
      }
    }

    if (failedJourneys.length > 0) {
      throw new Error(`${failedJourneys.length} journeys failed: ${failedJourneys.join(',')}`);
    }
  },
  {
    flags: {
      string: ['kibana-install-dir', 'journey-config-path'],
    },
  }
);
