import { relative, resolve } from 'path';
import Rx from 'rxjs/Rx';
import { withProcRunner } from '@kbn/dev-utils';

import {
  runElasticsearch,
  runKibanaServer,
  runFtr,
  KIBANA_FTR_SCRIPT,
} from './lib';

import { readConfigFile } from '../../../../src/functional_test_runner/lib';

const SUCCESS_MESSAGE = `

Elasticsearch and Kibana are ready for functional testing. Start the functional tests
in another terminal session by running this command from this directory:

    node ${relative(process.cwd(), KIBANA_FTR_SCRIPT)}

`;

/**
 * Run servers and tests for each config
 * @param {string[]} configPaths   Array of paths to configs
 * @param {boolean}  bail          Whether to exit test run at the first failure
 * @param {Log}      log           Optional logger
 */
export async function runTests(configPaths, { bail, log }) {
  if (!configPaths || configPaths.length === 0) {
    log.error(`runTests requires configPaths to contain at least one item`);
    process.exit(1);
  }

  for (const configPath of configPaths) {
    try {
      await runSingleConfig(resolve(process.cwd(), configPath), { bail, log });
    } catch (err) {
      fatalErrorHandler(err, { log });
    }
  }
}

/**
 * Start only servers using single config
 * @param {string}  configPath   Path to a config file
 * @param {Log}     log          Optional logger
 */
export async function startServers(configPath, { log }) {
  if (!configPath) {
    log.error(`startServers requires configPath`);
    process.exit(1);
  }

  configPath = resolve(process.cwd(), configPath);

  try {
    await withProcRunner(log, async procs => {
      const config = await readConfigFile(log, configPath);

      const es = await runElasticsearch({ config, log });
      await runKibanaServer({ procs, config, log });

      // wait for 5 seconds of silence before logging the
      // success message so that it doesn't get buried
      await silence(5000, { log });
      log.info(SUCCESS_MESSAGE);

      await procs.waitForAllToStop();
      await es.cleanup();
    });
  } catch (err) {
    fatalErrorHandler(err);
  }
}

async function silence(milliseconds, { log }) {
  return await Rx.Observable.fromEvent(log, 'data')
    .startWith(null)
    .switchMap(() => Rx.Observable.timer(milliseconds))
    .take(1)
    .toPromise();
}

/*
 * Start servers and run tests for single config
 */
async function runSingleConfig(configPath, { bail, log }) {
  await withProcRunner(log, async procs => {
    const config = await readConfigFile(log, configPath);

    const es = await runElasticsearch({ config, log });
    await runKibanaServer({ procs, config });

    // Note: When solving how to incorporate functional_test_runner
    // clean this up
    const logLevel = log.getLevel();
    await runFtr({
      procs,
      configPath,
      bail,
      logLevel,
      cwd: process.cwd(),
    });

    await procs.stop('kibana');
    await es.cleanup();
  });
}

function fatalErrorHandler(err, { log }) {
  log.error('FATAL ERROR');
  log.error(err);
  process.exit(1);
}
