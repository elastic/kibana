/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';

import { run, REPO_ROOT } from '@kbn/dev-utils';
import del from 'del';

import { RefOutputCache } from './ref_output_cache';
import { buildAllTsRefs, REF_CONFIG_PATHS } from './build_ts_refs';
import { getOutputsDeep } from './ts_configfile';
import { concurrentMap } from './concurrent_map';

const CACHE_WORKING_DIR = Path.resolve(REPO_ROOT, 'data/ts_refs_output_cache');

export async function runBuildRefsCli() {
  run(
    async ({ log, flags }) => {
      const outDirs = getOutputsDeep(REF_CONFIG_PATHS);

      const cacheEnabled = process.env.BUILD_TS_REFS_CACHE_ENABLE === 'true' || !!flags.cache;
      const doCapture = process.env.BUILD_TS_REFS_CACHE_CAPTURE === 'true';
      const doClean = !!flags.clean || doCapture;
      const doInitCache = cacheEnabled && !doClean;

      if (doClean) {
        log.info('deleting', outDirs.length, 'ts output directories');
        await concurrentMap(100, outDirs, (outDir) => del(outDir));
      }

      let outputCache;
      if (cacheEnabled) {
        outputCache = await RefOutputCache.create({
          log,
          outDirs,
          repoRoot: REPO_ROOT,
          workingDir: CACHE_WORKING_DIR,
          upstreamUrl: 'https://github.com/elastic/kibana.git',
        });
      }

      if (outputCache && doInitCache) {
        await outputCache.initCaches();
      }

      await buildAllTsRefs(log);

      if (outputCache && doCapture) {
        await outputCache.captureCache(Path.resolve(REPO_ROOT, 'target/ts_refs_cache'));
      }

      if (outputCache) {
        await outputCache.cleanup();
      }
    },
    {
      description: 'Build TypeScript projects',
      flags: {
        boolean: ['clean', 'cache'],
      },
      log: {
        defaultLevel: 'debug',
      },
    }
  );
}
