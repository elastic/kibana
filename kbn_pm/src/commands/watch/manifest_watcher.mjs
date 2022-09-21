/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fsp from 'fs/promises';

import * as Rx from 'rxjs';
import Chokidar from 'chokidar';
import { BAZEL_PACKAGE_DIRS, readPackageManifest } from '@kbn/bazel-packages';
import { REPO_ROOT } from '@kbn/utils';

import { normalizePath } from '../../lib/normalize_path.mjs';
import { getPackageJson } from '../../config_generation/generate_package_json.mjs';
import { getTsconfig } from '../../config_generation/generate_tsconfig.mjs';

export class ManifestWatcher {
  /** @type {import('@kbn/some-dev-log').SomeDevLog} */
  #log;

  /**
   * @param {import('@kbn/some-dev-log').SomeDevLog} log
   */
  constructor(log) {
    this.#log = log;
  }

  /**
   * @param {'change' | 'add'} type
   * @param {string} rel
   */
  #readManifest$(type, rel) {
    return Rx.defer(async () => {
      const path = Path.resolve(REPO_ROOT, rel);
      const manifest = readPackageManifest(path);

      const pkgDir = Path.dirname(path);
      const normalizedRepoRelativePkgDir = normalizePath(Path.relative(REPO_ROOT, pkgDir));
      const pkg = getPackageJson(manifest, normalizedRepoRelativePkgDir);
      const tsconfig = getTsconfig(manifest, normalizedRepoRelativePkgDir);

      await Promise.all([
        Fsp.writeFile(Path.resolve(pkgDir, 'package.json'), JSON.stringify(pkg, null, 2)),
        Fsp.writeFile(Path.resolve(pkgDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2)),
      ]);
    }).pipe(
      Rx.ignoreElements(),
      Rx.catchError((error) => {
        this.#log.error(
          `failed to update package.json after manifest change [type=${type}] [rel=${rel}]: ${error.message}`
        );

        return Rx.EMPTY;
      })
    );
  }

  async run() {
    this.#log.debug('setting up watcher for package manifest files');

    const watcher = Chokidar.watch(BAZEL_PACKAGE_DIRS.map((dir) => `${dir}/*/kibana.jsonc`));

    const error$ = Rx.fromEvent(watcher, 'error');
    const ready$ = Rx.fromEvent(watcher, 'ready');

    const update$ = /** @type {Rx.Observable<['change' | 'unlink' | 'add', string]>} */ (
      Rx.fromEvent(watcher, 'all')
    );

    const watching$ = update$.pipe(
      Rx.takeUntil(ready$),
      Rx.count(),
      Rx.tap((count) => {
        this.#log.info(`watching ${count} package manifest files for changes`);
      })
    );

    await Rx.lastValueFrom(
      Rx.merge(
        error$.pipe(
          Rx.map((err) => {
            throw err;
          })
        ),
        update$.pipe(
          Rx.skipUntil(watching$),
          Rx.mergeMap(([type, rel]) => {
            if (type === 'change' || type === 'add') {
              return this.#readManifest$(type, rel);
            }

            return Rx.EMPTY;
          })
        )
      )
    );
  }
}
