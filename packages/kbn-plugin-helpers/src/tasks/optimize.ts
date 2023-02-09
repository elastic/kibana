/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';
import { fork } from 'child_process';

import * as Rx from 'rxjs';
import { REPO_ROOT } from '@kbn/repo-info';
import { createFailError } from '@kbn/dev-cli-errors';
import { OptimizerConfig } from '@kbn/optimizer';
import { Bundle, BundleRemotes } from '@kbn/optimizer/src/common';
import { observeLines } from '@kbn/stdio-dev-helpers';

import { BuildContext } from '../build_context';

type WorkerMsg = { success: true; warnings: string } | { success: false; error: string };

export async function optimize({ log, plugin, sourceDir, buildDir }: BuildContext) {
  if (!plugin.manifest.ui) {
    return;
  }

  log.info('running @kbn/optimizer');
  await log.indent(2, async () => {
    const optimizerConfig = OptimizerConfig.create({
      repoRoot: REPO_ROOT,
      examples: false,
      testPlugins: false,
      includeCoreBundle: true,
      dist: true,
    });

    const bundle = new Bundle({
      id: plugin.manifest.id,
      contextDir: sourceDir,
      ignoreMetrics: true,
      outputDir: Path.resolve(buildDir, 'target/public'),
      sourceRoot: sourceDir,
      type: 'plugin',
      remoteInfo: {
        pkgId: 'not-importable',
        targets: ['public', 'common'],
      },
    });

    const remotes = BundleRemotes.fromBundles([...optimizerConfig.bundles, bundle]);
    const worker = optimizerConfig.getWorkerConfig('cache disabled');

    const proc = fork(require.resolve('./optimize_worker'), {
      cwd: REPO_ROOT,
      execArgv: ['--require=@kbn/babel-register/install'],
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
    });

    const result = await Rx.lastValueFrom(
      Rx.race(
        observeLines(proc.stdout!).pipe(
          Rx.tap((line) => log.debug(line)),
          Rx.ignoreElements()
        ),
        observeLines(proc.stderr!).pipe(
          Rx.tap((line) => log.error(line)),
          Rx.ignoreElements()
        ),
        Rx.defer(() => {
          proc.send({
            workerConfig: worker,
            bundles: JSON.stringify([bundle.toSpec()]),
            bundleRemotes: remotes.toSpecJson(),
          });

          return Rx.merge(
            Rx.fromEvent<[WorkerMsg]>(proc, 'message').pipe(
              Rx.map((msg) => {
                return msg[0];
              })
            ),
            Rx.fromEvent<Error>(proc, 'error').pipe(
              Rx.map((error) => {
                throw error;
              })
            )
          ).pipe(
            Rx.take(1),
            Rx.tap({
              complete() {
                proc.kill('SIGKILL');
              },
            })
          );
        })
      )
    );

    // cleanup unnecessary files
    Fs.unlinkSync(Path.resolve(bundle.outputDir, '.kbn-optimizer-cache'));

    const rel = Path.relative(REPO_ROOT, bundle.outputDir);
    if (!result.success) {
      throw createFailError(`Optimizer failure: ${result.error}`);
    } else if (result.warnings) {
      log.warning(`browser bundle created at ${rel}, but with warnings:\n${result.warnings}`);
    } else {
      log.success(`browser bundle created at ${rel}`);
    }
  });
}
