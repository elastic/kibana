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
  FUNCTIONAL_CONFIG_PATH,
  API_CONFIG_PATH,
} from './lib';

import { readConfigFile } from '../../../../src/functional_test_runner/lib';

const SUCCESS_MESSAGE = `

Elasticsearch and Kibana are ready for functional testing. Start the functional tests
in another terminal session by running this command from this directory:

    node ${relative(process.cwd(), KIBANA_FTR_SCRIPT)}

`;

// Takes in multiple configs, comma separated
// Runs servers and tests for each config
export async function runTests(
  configPaths = [FUNCTIONAL_CONFIG_PATH, API_CONFIG_PATH],
  runEs = runElasticsearch,
  runKbn = runKibanaServer
) {
  const configs = [];

  // Make a list of config paths based on --config or defaults
  try {
    configs.push(...getopts(process.argv.slice(2)).config.split(','));
  } catch (err) {
    configs.push(...configPaths);
  }

  // Run servers and tests for each
  try {
    for (let configPath of configs) {
      configPath = await resolve(KIBANA_ROOT, configPath);
      await runWithConfig(configPath, runEs, runKbn);
    }
  } catch (err) {
    fatalErrorHandler(err);
  }
}

// Start only servers using single config
export async function startServers(
  configPath = FUNCTIONAL_CONFIG_PATH,
  runEs = runElasticsearch,
  runKbn = runKibanaServer
) {
  const configOption = getopts(process.argv.slice(2)).config;

  configPath = await resolve(KIBANA_ROOT, configOption || configPath);

  await withTmpDir(async tmpDir => {
    await withProcRunner(async procs => {
      const config = await readConfigFile(log, configPath);

      await runEs({ tmpDir, procs, config });
      await runKbn({ procs, config });

      // wait for 5 seconds of silence before logging the success message
      // so that it doesn't get buried
      await Rx.Observable.fromEvent(log, 'data')
        .switchMap(() => Rx.Observable.timer(5000))
        .first()
        .toPromise();

      log.info(SUCCESS_MESSAGE);
      await procs.waitForAllToStop();
    });
  });
}

// Start servers and run tests for single config
async function runWithConfig(
  configPath = FUNCTIONAL_CONFIG_PATH,
  runEs = runElasticsearch,
  runKbn = runKibanaServer
) {
  try {
    await withTmpDir(async tmpDir => {
      await withProcRunner(async procs => {
        const config = await readConfigFile(log, configPath);

        await runEs({ tmpDir, procs, config });
        await runKbn({ procs, config });
        await runFtr({ procs, configPath, cwd: process.cwd() });

        await procs.stop('kibana');
        await procs.stop('es');
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
