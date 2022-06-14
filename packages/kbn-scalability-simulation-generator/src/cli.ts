/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** ***********************************************************
 *
 *  Run `node scripts/generate_scalability_simulations --help` for usage information
 *
 *************************************************************/

import { run } from '@kbn/dev-cli-runner';
import { createFlagError } from '@kbn/dev-cli-errors';
import path from 'path';
import fs from 'fs';
import { generator } from './generate_files';

const gatlingBundlePackageName = 'computerdatabase';

export async function generateScalabilitySimulations() {
  run(
    async ({ log, flags }) => {
      const baseUrl = flags.baseUrl;
      if (baseUrl && typeof baseUrl !== 'string') {
        throw createFlagError('--baseUrl must be a string');
      }
      if (!baseUrl) {
        throw createFlagError('--baseUrl must be defined');
      }

      if (typeof flags.dir !== 'string') {
        throw createFlagError('--dir must be a string');
      }

      const dir = path.resolve(flags.dir);
      if (!dir) {
        throw createFlagError('--dir must be defined');
      }
      if (!fs.existsSync(path.resolve(dir))) {
        throw createFlagError('--dir must be an existing folder path');
      }

      if (typeof flags.packageName !== 'undefined' && typeof flags.packageName !== 'string') {
        throw createFlagError('--packageName is optional, but must be a string');
      }

      const packageName = !flags.packageName ? gatlingBundlePackageName : flags.packageName;

      return generator({
        dir,
        baseUrl,
        packageName,
        log,
      });
    },
    {
      description: `CLI to get scalability simulation file out of single user performance journey APM traces`,
      flags: {
        string: ['dir', 'baseUrl', 'packageName'],
        help: `
           --dir              Path to json files with APM traces, generated using kbn-performance-testing-dataset-extractor
           --baseUrl          Kibana server base url to use for scalability testing
           --packageName      Simulation file package reference: ${gatlingBundlePackageName} is used by default and assumes
                              a run with Gatling bundle. Use 'org.kibanaLoadTest' to run with 'kibana-load-testing' project.
         `,
      },
      usage: '--dir target/scalability_traces --baseUrl http://localhost:5620',
    }
  );
}
