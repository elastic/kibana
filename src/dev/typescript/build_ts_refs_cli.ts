/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '@kbn/dev-utils';
import del from 'del';

import { buildAllTsRefs, REF_CONFIG_PATHS } from './build_ts_refs';
import { getOutputsDeep } from './ts_configfile';
import { concurrentMap } from './concurrent_map';

export async function runBuildRefsCli() {
  run(
    async ({ log, flags }) => {
      if (flags.clean) {
        const outDirs = getOutputsDeep(REF_CONFIG_PATHS);
        log.info('deleting', outDirs.length, 'ts output directories');
        await concurrentMap(100, outDirs, (outDir) => del(outDir));
      }

      await buildAllTsRefs(log);
    },
    {
      description: 'Build TypeScript projects',
      flags: {
        boolean: ['clean'],
      },
      log: {
        defaultLevel: 'debug',
      },
    }
  );
}
