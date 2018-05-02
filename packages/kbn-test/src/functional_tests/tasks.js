import { relative, resolve } from 'path';
import Rx from 'rxjs/Rx';
import getopts from 'getopts';
import { withProcRunner } from '@kbn/dev-utils';

import {
  withTmpDir,
  runKibanaServer,
  runElasticsearch,
  runFtr,
  log,
  KIBANA_ROOT,
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
 * @param {configPaths}     array of paths to configs
 * @param {options}         optional
 * @param {options.runEs}   method to start elasticsearch
 * @param {options.runKbn}  method to start kibana
 * }
 */
export async function runTests(
  configPaths,
  options = {
    runEs: runElasticsearch,
    runKbn: runKibanaServer,
  }
) {
  if (!configPaths || configPaths.length === 0) {
    throw new Error('runTests requires configPaths to contain at least one item');
  }

  for (const configPath of configPaths) {
    try {
      await runSingleConfig(resolve(KIBANA_ROOT, configPath), options);
    } catch (err) {
      fatalErrorHandler(err);
    }
  }
}


/**
 * Start only servers using single config
 * @param {configPath}      path to a config file
 * @param {options}         optional
 * @param {options.runEs}   method to start elasticsearch
 * @param {options.runKbn}  method to start kibana
 */
export async function startServers(
  configPath,
  options = {
    runEs: runElasticsearch,
    runKbn: runKibanaServer,
  }
) {
  if (!configPath) {
    throw new Error('startServers requires configPath');
  }

  const configOption = getopts(process.argv.slice(2)).config;

  configPath = await resolve(KIBANA_ROOT, configOption || configPath);

  try {
    await withTmpDir(async tmpDir => {
      await withProcRunner(async procs => {
        const config = await readConfigFile(log, configPath);
        const { runEs, runKbn } = options;

        const es = await runEs({ tmpDir, config });
        await runKbn({ procs, config });

        // wait for 5 seconds of silence before logging the success message
        // so that it doesn't get buried
        await Rx.Observable.fromEvent(log, 'data')
          .switchMap(() => Rx.Observable.timer(5000))
          .first()
          .toPromise();

        log.info(SUCCESS_MESSAGE);
        await procs.waitForAllToStop();
        await es.cleanup();
      });
    });
  } catch (err) {
    fatalErrorHandler(err);
  }
}


/*
 * Start servers and run tests for single config
 */
async function runSingleConfig(
  configPath,
  options = {
    runEs: runElasticsearch,
    runKbn: runKibanaServer,
  }
) {
  try {
    await withTmpDir(async tmpDir => {
      await withProcRunner(async procs => {
        const config = await readConfigFile(log, configPath);
        const { runEs, runKbn } = options;

        const es = await runEs({ tmpDir, config });
        await runKbn({ procs, config });
        await runFtr({ procs, configPath, cwd: process.cwd() });

        await procs.stop('kibana');
        await es.cleanup();
      });
    });
  } catch (err) {
    fatalErrorHandler(err);
  }
}


function fatalErrorHandler(err) {
  log.error('FATAL ERROR');
  log.error(err);
  process.exit(1);
}
