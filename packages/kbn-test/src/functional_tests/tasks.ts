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
import { withProcRunner, ToolingLog, REPO_ROOT, getTimeReporter } from '@kbn/dev-utils';
import dedent from 'dedent';

import {
  runElasticsearch,
  runKibanaServer,
  runFtr,
  assertNoneExcluded,
  hasTests,
  KIBANA_FTR_SCRIPT,
  CreateFtrOptions,
} from './lib';

import { readConfigFile } from '../functional_test_runner/lib';

const makeSuccessMessage = (options: StartServerOptions) => {
  const installDirFlag = options.installDir ? ` --kibana-install-dir=${options.installDir}` : '';
  const configPaths: string[] = Array.isArray(options.config) ? options.config : [options.config];
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
 */
interface RunTestsParams extends CreateFtrOptions {
  /** Array of paths to configs */
  configs: string[];
  /** run from source instead of snapshot */
  esFrom?: string;
  createLogger: () => ToolingLog;
  extraKbnOpts: string[];
  assertNoneExcluded: boolean;
}
export async function runTests(options: RunTestsParams) {
  if (!process.env.KBN_NP_PLUGINS_BUILT && !options.assertNoneExcluded) {
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

  const log = options.createLogger();

  if (options.assertNoneExcluded) {
    log.write('--- asserting that all tests belong to a ciGroup');
    for (const configPath of options.configs) {
      log.info('loading', configPath);
      log.indent(4);
      try {
        await assertNoneExcluded({ configPath, options: { ...options, log } });
      } finally {
        log.indent(-4);
      }
      continue;
    }

    return;
  }

  log.write('--- determining which ftr configs to run');
  const configPathsWithTests: string[] = [];
  for (const configPath of options.configs) {
    log.info('testing', configPath);
    log.indent(4);
    try {
      if (await hasTests({ configPath, options: { ...options, log } })) {
        configPathsWithTests.push(configPath);
      }
    } finally {
      log.indent(-4);
    }
  }

  for (const configPath of configPathsWithTests) {
    log.write(`--- Running ${relative(REPO_ROOT, configPath)}`);

    await withProcRunner(log, async (procs) => {
      const config = await readConfigFile(log, configPath);

      let es;
      try {
        es = await runElasticsearch({ config, options: { ...options, log } });
        await runKibanaServer({ procs, config, options });
        await runFtr({ configPath, options: { ...options, log } });
      } finally {
        try {
          const delay = config.get('kbnTestServer.delayShutdown');
          if (typeof delay === 'number') {
            log.info('Delaying shutdown of Kibana for', delay, 'ms');
            await new Promise((r) => setTimeout(r, delay));
          }

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

interface StartServerOptions {
  /** Path to a config file */
  config: string;
  log: ToolingLog;
  /** installation dir from which to run Kibana */
  installDir?: string;
  /** run from source instead of snapshot */
  esFrom?: string;
  createLogger: () => ToolingLog;
  extraKbnOpts: string[];
  useDefaultConfig?: boolean;
}

export async function startServers({ ...options }: StartServerOptions) {
  const runStartTime = Date.now();
  const toolingLog = new ToolingLog({
    level: 'info',
    writeTo: process.stdout,
  });
  const reportTime = getTimeReporter(toolingLog, 'scripts/functional_tests_server');

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

    reportTime(runStartTime, 'ready', {
      success: true,
      ...options,
    });

    // wait for 5 seconds of silence before logging the
    // success message so that it doesn't get buried
    await silence(log, 5000);
    log.success(makeSuccessMessage(options));

    await procs.waitForAllToStop();
    await es.cleanup();
  });
}

async function silence(log: ToolingLog, milliseconds: number) {
  await log
    .getWritten$()
    .pipe(
      startWith(null),
      switchMap(() => Rx.timer(milliseconds)),
      take(1)
    )
    .toPromise();
}
