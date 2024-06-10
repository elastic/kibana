/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { encode } from 'node:querystring';
import fetch from 'node-fetch';
import { run } from '@kbn/dev-cli-runner';
import { startTSWorker } from '@kbn/dev-utils';
import { createTestEsCluster } from '@kbn/test';
import * as Rx from 'rxjs';
import { REPO_ROOT } from '@kbn/repo-info';
import chalk from 'chalk';
import type { Result } from './kibana_worker';

const OAS_FILE_PATH = path.resolve(REPO_ROOT, './oas_docs/bundle.json');

export const sortAndPrettyPrint = (object: object) => {
  const keys = new Set<string>();
  JSON.stringify(object, (key, value) => {
    keys.add(key);
    return value;
  });
  return JSON.stringify(object, Array.from(keys).sort(), 2);
};

const MB = 1024 * 1024;
const twoDeci = (num: number) => Math.round(num * 100) / 100;

run(
  async ({ log, flagsReader, addCleanupTask }) => {
    const update = flagsReader.boolean('update');
    const pathStartsWith = flagsReader.arrayOfStrings('include-path');
    const excludePathsMatching = flagsReader.arrayOfStrings('exclude-path') ?? [];

    // internal consts
    const port = 5622;
    // We are only including /api/status for now
    excludePathsMatching.push(
      '/{path*}',
      // Our internal asset paths
      '/XXXXXXXXXXXX/'
    );

    log.info('Starting es...');
    await log.indent(4, async () => {
      const cluster = createTestEsCluster({ log });
      await cluster.start();
      addCleanupTask(() => cluster.cleanup());
    });

    log.info('Starting Kibana...');
    await log.indent(4, async () => {
      log.info('Loading core with all plugins enabled so that we can capture OAS for all...');
      const { msg$, proc } = startTSWorker<Result>({
        log,
        src: require.resolve('./kibana_worker'),
      });
      await Rx.firstValueFrom(
        msg$.pipe(
          Rx.map((msg) => {
            if (msg !== 'ready')
              throw new Error(`received unexpected message from worker (expected "ready"): ${msg}`);
          })
        )
      );
      addCleanupTask(() => proc.kill('SIGILL'));
    });

    try {
      const qs = encode({
        access: 'public',
        version: '2023-10-31', // hard coded for now, we can make this configurable later
        pathStartsWith,
        excludePathsMatching,
      });
      const url = `http://localhost:${port}/api/oas?${qs}`;
      log.info(`Fetching OAS at ${url}...`);
      const result = await fetch(url, {
        headers: {
          'kbn-xsrf': 'kbn-oas-snapshot',
          authorization: `Basic ${Buffer.from('elastic:changeme').toString('base64')}`,
        },
      });
      if (result.status !== 200) {
        log.error(`Failed to fetch OAS: ${JSON.stringify(result, null, 2)}`);
        throw new Error(`Failed to fetch OAS: ${result.status}`);
      }
      const currentOas = await result.json();
      log.info(`Recieved OAS, writing to ${OAS_FILE_PATH}...`);
      if (update) {
        await fs.writeFile(OAS_FILE_PATH, sortAndPrettyPrint(currentOas));
        const { size: sizeBytes } = await fs.stat(OAS_FILE_PATH);
        log.success(`OAS written to ${OAS_FILE_PATH}. File size ~${twoDeci(sizeBytes / MB)} MB.`);
      } else {
        log.success(
          `OAS recieved, not writing to file. Got OAS for ${
            Object.keys(currentOas.paths).length
          } paths.`
        );
      }
    } catch (err) {
      log.error(`Failed to capture OAS: ${JSON.stringify(err, null, 2)}`);
      throw err;
    }
  },
  {
    description: `
      Get the current OAS from Kibana's /api/oas API
    `,
    flags: {
      boolean: ['update'],
      string: ['include-path', 'exclude-path'],
      default: {
        fix: false,
      },
      help: `
        --include-path            Path to include. Path must start with provided value. Can be passed multiple times.
        --exclude-path            Path to exclude. Path must NOT start with provided value. Can be passed multiple times.
        --update                  Write the current OAS to ${chalk.cyan(OAS_FILE_PATH)}.
      `,
    },
  }
);
