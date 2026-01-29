/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs/promises';
import type { ChildProcess } from 'node:child_process';
import * as Rx from 'rxjs';
import { startTSWorker } from '@kbn/dev-utils';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Result } from './kibana_worker';
import { sortAndPrettyPrint } from './run_capture_oas_snapshot_cli';
import { buildFlavourEnvArgName, filtersJsonEnvArgName } from './common';

interface CaptureOasSnapshotArgs {
  log: ToolingLog;
  buildFlavour: 'serverless' | 'traditional';
  outputFile: string;
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
  outputFile,
}: CaptureOasSnapshotArgs): Promise<void> {
  const { excludePathsMatching = [], pathStartsWith } = filters;
  // We are only including /api/status for now
  excludePathsMatching.push(
    '/{path*}',
    // Our internal asset paths
    '/XXXXXXXXXXXX/'
  );

  try {
    log.info('Starting Kibana...');

    const currentOas = await log.indent(4, async () => {
      log.info('Loading core with all plugins enabled so that we can capture OAS for all...');
      let proc: undefined | ChildProcess;
      try {
        const worker = startTSWorker<Result>({
          log,
          src: require.resolve('./kibana_worker'),
          env: {
            ...process.env,
            [buildFlavourEnvArgName]: buildFlavour,
            [filtersJsonEnvArgName]: JSON.stringify({
              access: 'public',
              version: '2023-10-31', // hard coded for now, we can make this configurable later
              pathStartsWith,
              excludePathsMatching,
            }),
          },
        });
        proc = worker.proc;
        return await Rx.firstValueFrom(
          worker.msg$.pipe(
            Rx.map((result) => {
              try {
                return JSON.parse(result);
              } catch (e) {
                throw new Error('expected JSON, received:' + result);
              }
            })
          )
        );
      } finally {
        proc?.kill('SIGKILL');
      }
    });

    log.info(`Recieved OAS, writing to ${outputFile}...`);
    await fs.writeFile(outputFile, sortAndPrettyPrint(currentOas));
    const { size: sizeBytes } = await fs.stat(outputFile);
    log.success(`OAS written to ${outputFile}. File size ~${twoDeci(sizeBytes / MB)} MB.`);
  } catch (err) {
    log.error(`Failed to capture OAS: ${err}`);
    throw err;
  }
}
