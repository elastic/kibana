/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs/promises';
import { encode } from 'node:querystring';
import type { ChildProcess } from 'node:child_process';
import fetch from 'node-fetch';
import * as Rx from 'rxjs';
import { startTSWorker } from '@kbn/dev-utils';
import { createTestEsCluster } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { createTestServerlessInstances } from '@kbn/core-test-helpers-kbn-server';
import type { Result } from './kibana_worker';
import { sortAndPrettyPrint } from './run_capture_oas_snapshot_cli';
import { buildFlavourEnvArgName } from './common';

interface CaptureOasSnapshotArgs {
  log: ToolingLog;
  buildFlavour: 'serverless' | 'traditional';
  outputFile: string;
  update: boolean;
  filters?: {
    pathStartsWith?: string[];
    excludePathsMatching?: string[];
  };
}

const MB = 1024 * 1024;
const twoDeci = (num: number) => Math.round(num * 100) / 100;

export async function captureOasSnapshot({
  log,
  filters = {},
  buildFlavour,
  update,
  outputFile,
}: CaptureOasSnapshotArgs): Promise<void> {
  const { excludePathsMatching = [], pathStartsWith } = filters;
  // internal consts
  const port = 5622;
  // We are only including /api/status for now
  excludePathsMatching.push(
    '/{path*}',
    // Our internal asset paths
    '/XXXXXXXXXXXX/'
  );

  let esCluster: undefined | { stop(): Promise<void> };
  let kbWorker: undefined | ChildProcess;

  try {
    log.info('Starting es...');
    esCluster = await log.indent(4, async () => {
      if (buildFlavour === 'serverless') {
        const { startES } = createTestServerlessInstances();
        return await startES();
      }
      const cluster = createTestEsCluster({ log });
      await cluster.start();
      return { stop: () => cluster.cleanup() };
    });

    log.info('Starting Kibana...');
    kbWorker = await log.indent(4, async () => {
      log.info('Loading core with all plugins enabled so that we can capture OAS for all...');
      const { msg$, proc } = startTSWorker<Result>({
        log,
        src: require.resolve('./kibana_worker'),
        env: { ...process.env, [buildFlavourEnvArgName]: buildFlavour },
      });
      await Rx.firstValueFrom(
        msg$.pipe(
          Rx.map((msg) => {
            if (msg !== 'ready')
              throw new Error(`received unexpected message from worker (expected "ready"): ${msg}`);
          })
        )
      );
      return proc;
    });

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
    log.info(`Recieved OAS, writing to ${outputFile}...`);
    if (update) {
      await fs.writeFile(outputFile, sortAndPrettyPrint(currentOas));
      const { size: sizeBytes } = await fs.stat(outputFile);
      log.success(`OAS written to ${outputFile}. File size ~${twoDeci(sizeBytes / MB)} MB.`);
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
  } finally {
    kbWorker?.kill('SIGILL');
    await esCluster?.stop();
  }
}
