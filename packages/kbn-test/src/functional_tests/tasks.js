/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { relative } from 'path';
import * as Rx from 'rxjs';
import { startWith, switchMap, take } from 'rxjs/operators';
import { withProcRunner } from '@kbn/dev-utils';
import dedent from 'dedent';

import {
  runElasticsearch,
  runKibanaServer,
  runFtr,
  assertNoneExcluded,
  hasTests,
  KIBANA_FTR_SCRIPT,
} from './lib';

import { readConfigFile } from '../functional_test_runner/lib';

const makeSuccessMessage = (options) => {
  const installDirFlag = options.installDir ? ` --kibana-install-dir=${options.installDir}` : '';
  const configPaths = Array.isArray(options.config) ? options.config : [options.config];
  const pathsMessage = options.useDefaultConfig
    ? ''
    : configPaths
        .map((path) => relative(process.cwd(), path))
        .map((path) => ` --config ${path}`)
        .join('');

  return (
    '\n\n' +
    dedent`
      Elasticsearch and Kibana are ready for functional testing. Start the functional tests
      in another terminal session by running this command from this directory:

          node ${relative(process.cwd(), KIBANA_FTR_SCRIPT)}${installDirFlag}${pathsMessage}
    ` +
    '\n\n'
  );
};

/**
 * Run servers and tests for each config
 * @param {object} options                   Optional
 * @property {string[]} options.configs      Array of paths to configs
 * @property {function} options.log          An instance of the ToolingLog
 * @property {string} options.installDir     Optional installation dir from which to run Kibana
 * @property {boolean} options.bail          Whether to exit test run at the first failure
 * @property {string} options.esFrom         Optionally run from source instead of snapshot
 */
export async function runTests(options) {
  if (!process.env.KBN_NP_PLUGINS_BUILT) {
    const log = options.createLogger();
    log.warning('❗️❗️❗️');
    log.warning('❗️❗️❗️');
    log.warning('❗️❗️❗️');
    log.warning(
      "   Don't forget to use `node scripts/build_kibana_platform_plugins` to build plugins you plan on testing"
    );
    log.warning('❗️❗️❗️');
    log.warning('❗️❗️❗️');
    log.warning('❗️❗️❗️');
  }

  for (const configPath of options.configs) {
    const log = options.createLogger();
    const opts = {
      ...options,
      log,
    };

    log.info('Running', configPath);
    log.indent(2);

    if (options.assertNoneExcluded) {
      await assertNoneExcluded({ configPath, options: opts });
      continue;
    }

    if (!(await hasTests({ configPath, options: opts }))) {
      log.info('Skipping', configPath, 'since all tests are excluded');
      continue;
    }

    await withProcRunner(log, async (procs) => {
      const config = await readConfigFile(log, configPath);

      let es;
      try {
        es = await runElasticsearch({ config, options: opts });
        await runKibanaServer({ procs, config, options: opts });
        await runFtr({ configPath, options: opts });
      } finally {
        try {
          await procs.stop('kibana');
        } finally {
          if (es) {
            await es.cleanup();
          }
        }
      }
    });
  }
}

/**
 * Start only servers using single config
 * @param {object} options                   Optional
 * @property {string} options.config         Path to a config file
 * @property {function} options.log          An instance of the ToolingLog
 * @property {string} options.installDir     Optional installation dir from which to run Kibana
 * @property {string} options.esFrom         Optionally run from source instead of snapshot
 */
export async function startServers(options) {
  const log = options.createLogger();
  const opts = {
    ...options,
    log,
  };

  await withProcRunner(log, async (procs) => {
    const config = await readConfigFile(log, options.config);

    const es = await runElasticsearch({ config, options: opts });
    await runKibanaServer({
      procs,
      config,
      options: {
        ...opts,
        extraKbnOpts: [
          ...options.extraKbnOpts,
          ...(options.installDir ? [] : ['--dev', '--no-dev-config']),
        ],
      },
    });

    // wait for 5 seconds of silence before logging the
    // success message so that it doesn't get buried
    await silence(log, 5000);
    log.success(makeSuccessMessage(options));

    await procs.waitForAllToStop();
    await es.cleanup();
  });
}

async function silence(log, milliseconds) {
  await log
    .getWritten$()
    .pipe(
      startWith(null),
      switchMap(() => Rx.timer(milliseconds)),
      take(1)
    )
    .toPromise();
}
