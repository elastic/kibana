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
import { Journey } from './run_performance_cli';

run(
  async ({ log, flagsReader, procRunner }) => {
    const kibanaInstallDir = flagsReader.path('kibana-install-dir');
    const journeyPath = flagsReader.requiredPath('journey-path');

    if (kibanaInstallDir && !fs.existsSync(kibanaInstallDir)) {
      throw createFlagError('--kibana-install-dir must be an existing directory');
    }
    if (
      !fs.existsSync(journeyPath) ||
      (!fs.statSync(journeyPath).isDirectory() && path.extname(journeyPath) !== '.json')
    ) {
      throw createFlagError('--journey-path must be an existing directory or journey path');
    }

    const journeys: Journey[] = fs.statSync(journeyPath).isDirectory()
      ? fs
          .readdirSync(journeyPath)
          .filter((fileName) => path.extname(fileName) === '.json')
          .map((fileName) => {
            return {
              name: path.parse(fileName).name,
              path: path.resolve(journeyPath, fileName),
            };
          })
      : [{ name: path.parse(journeyPath).name, path: journeyPath }];

    log.info(
      `Found ${journeys.length} journeys to run: ${JSON.stringify(journeys.map((j) => j.name))}`
    );

    const failedJourneys = [];

    for (const journey of journeys) {
      try {
        process.stdout.write(`--- Running scalability journey: ${journey.name}\n`);
        await runScalabilityJourney(journey.path, kibanaInstallDir);
      } catch (e) {
        log.error(e);
        failedJourneys.push(journey.name);
      }
    }

    if (failedJourneys.length > 0) {
      throw new Error(`${failedJourneys.length} journeys failed: ${failedJourneys.join(',')}`);
    }

    async function runScalabilityJourney(filePath: string, kibanaBuildDir: string | undefined) {
      await procRunner.run('scalability-tests', {
        cmd: 'node',
        args: [
          'scripts/functional_tests',
          ['--config', 'x-pack/test/scalability/config.ts'],
          kibanaBuildDir ? ['--kibana-install-dir', kibanaBuildDir] : [],
          '--debug',
          '--logToFile',
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
          SCALABILITY_JOURNEY_PATH: filePath, // journey json file for Gatling test runner
          KIBANA_DIR: REPO_ROOT, // Gatling test runner use it to find kbn/es archives
        },
      });
    }
  },
  {
    flags: {
      string: ['kibana-install-dir', 'journey-path'],
      help: `
      --kibana-install-dir=dir      Run Kibana from existing install directory instead of from source
      --journey-path=path           Define path to scalability journey config or directory with multiple
                                    configs that should be executed
    `,
    },
  }
);
