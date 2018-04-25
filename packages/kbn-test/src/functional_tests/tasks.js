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
  FTR_CONFIG_PATH,
  MULTIPLE_CONFIG_PATH,
} from './lib';

import { readConfigFile } from '../../../../src/functional_test_runner/lib';

const SUCCESS_MESSAGE = `

Elasticsearch and Kibana are ready for functional testing. Start the functional tests
in another terminal session by running this command from this directory:

    node ${relative(process.cwd(), KIBANA_FTR_SCRIPT)}

`;

// Takes in a config listing multiple configs
// Runs servers and tests for each config
export async function runTests(
  configPath = MULTIPLE_CONFIG_PATH,
  runEs = runElasticsearch,
  runKbn = runKibanaServer
) {
  const configOption = getopts(process.argv.slice(2)).config;

  configPath = await resolve(KIBANA_ROOT, configOption || configPath);

  try {
    const config = require(configPath)();

    for (const configFile of config.configFiles) {
      await runWithConfig(configFile, runEs, runKbn);
    }
  } catch (err) {
    fatalErrorHandler(err);
  }
}

// Start only servers using single config
export async function startServers(
  configPath = FTR_CONFIG_PATH,
  runEs = runElasticsearch,
  runKbn = runKibanaServer
) {
  // TODO: make note about change to saml option
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
// TODO: don't export this--
export async function runWithConfig(
  configPath = FTR_CONFIG_PATH,
  runEs = runElasticsearch,
  runKbn = runKibanaServer
) {
  configPath = resolveConfigPath(configPath);

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

function resolveConfigPath(configPath) {
  // NOTE: when --config is passed into runTests
  // configPath gets incorrectly passed to runWithConfig
  const originalCall = process.argv[1].split('/').slice(-1)[0];
  // if this process was started in runWithConfig, parse argv
  if (originalCall === 'functional_tests_single') {
    const configOption = getopts(process.argv.slice(2)).config;
    return resolve(KIBANA_ROOT, configOption || configPath);
  } else {
    // process was started in runTests or other method, so don't parse argv
    return resolve(KIBANA_ROOT, configPath);
  }
}

function fatalErrorHandler(err) {
  log.error('FATAL ERROR');
  log.error(err);
  process.exit(1);
}
