/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import globby from 'globby';
import { readFileSync, existsSync } from 'fs';
import { cwd } from 'process';
import path from 'path';
import { Task } from '../lib';

const KIBANA_HOST = process.env.ES || 'http://localhost:5601';
const KIBANA_API_KEY = process.env.API_KEY || 'YOUR_API_KEY';

export const UploadSourcemapsToApm: Task = {
  description: 'Uploading sourcemaps to APM',

  async run(config, log, build) {
    // /src/dev/build/cli.ts configures cwd to be the root of the Kibana repo
    const root = cwd();

    const version = config.getBuildVersion();

    const sourceMaps = await globby(`${root}/src/**/*.map`, {
      ignore: ['**/node_modules/**'],
    });

    if (sourceMaps.length === 0) {
      log.info('No sourcemaps found to upload.');
      return;
    }

    for (const sourceMap of sourceMaps) {
      try {
        log.info(`Processing sourcemap: ${sourceMap}`);

        const metricsPath = `${path.dirname(sourceMap)}/metrics.json`;

        if (!existsSync(metricsPath)) {
          log.error(`No metrics.json found for ${sourceMap}. Skipping upload.`);
          continue;
        }

        const metricsContent = readFileSync(metricsPath, 'utf8');
        const metrics = JSON.parse(metricsContent);

        const bundle = sourceMap.split('.map')[0];

        const id = metrics[0]?.id || 'unknown-app';

        const compressedSourceMap = `${sourceMap}.gz`;

        // Compress the sourcemap using gzip
        execa.sync('gzip', [`-c "${sourceMap}" > "${compressedSourceMap}"`]);

        const formData = new FormData();
        formData.append('service_name', id);
        formData.append('service_version', version);
        formData.append('bundle_filepath', bundle);
        formData.append(
          'sourcemap',
          JSON.stringify({
            version: 3,
            file: bundle,
            sources: [compressedSourceMap],
            sourcesContent: ['content'],
            mappings: 'mapping',
            sourceRoot: '',
          })
        );

        await fetch(`${KIBANA_HOST}/api/apm/sourcemaps`, {
          method: 'POST',
          headers: {
            'kbn-xsrf': 'true',
            Authorization: `ApiKey ${KIBANA_API_KEY}`,
          },
          body: formData,
        });
      } catch (error) {
        log.error(`Failed to upload sourcemap ${sourceMap}: ${error}`);
        throw error;
      }
    }
  },
};
