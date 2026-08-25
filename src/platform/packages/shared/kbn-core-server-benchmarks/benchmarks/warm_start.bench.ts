/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { BenchmarkRunnable } from '@kbn/bench';
import getPort from 'get-port';
import Path from 'path';
import type { ExecaChildProcess } from 'execa';
import { startEs, startKibana, stopGracefully } from './utils';

export const WARM_START_POST_READY_SETTLING_MS = 30_000;

// eslint-disable-next-line import/no-default-export
export default async (): Promise<BenchmarkRunnable> => {
  const kbnPort = await getPort({ port: 5701 });

  let esPort: number | undefined;
  let esProc: ExecaChildProcess | undefined;
  let kbnProc: ExecaChildProcess | undefined;

  return {
    monitoring: {
      collectForcedGcHeapStatsOnStop: true,
    },
    async beforeAll({ workspace, log, buildDir }) {
      if (!buildDir) {
        await workspace.ensureBuild();
      }

      const { port, proc } = await startEs({
        cwd: workspace.getDir(),
        log,
        basePath: Path.join(
          workspace.getDir(),
          'data',
          'warm_start_memory',
          workspace.getDisplayName(),
          String(kbnPort)
        ),
      });

      esProc = proc;
      esPort = port;

      const firstKbnProc = await startKibana({
        cwd: workspace.getDir(),
        buildDir,
        log,
        port: kbnPort,
        esPort: esPort!,
      });

      await stopGracefully(firstKbnProc.proc, { log, name: 'kibana' });
    },
    async run({ workspace, log, buildDir }) {
      const { proc } = await startKibana({
        cwd: workspace.getDir(),
        buildDir,
        log,
        port: kbnPort,
        esPort: esPort!,
      });

      kbnProc = proc;
      await new Promise<void>((resolve) => setTimeout(resolve, WARM_START_POST_READY_SETTLING_MS));
    },
    async after({ log }) {
      // intentionally keep ES running across iterations; only killing Kibana
      if (kbnProc) {
        await stopGracefully(kbnProc, { log, name: 'kibana' });
      }
      kbnProc = undefined;
    },
    async afterAll({ log }) {
      if (esProc) {
        await stopGracefully(esProc, { log, name: 'elasticsearch' });
      }
    },
  };
};
