import { resolve } from 'path';
// import Rx from 'rxjs/Rx';
import getopts from 'getopts';
import { withProcRunner } from '@kbn/dev-utils';

import {
  withTmpDir,
  runKibanaServer,
  runElasticsearch,
  runFtr,
  log,
  isCliError,
  KIBANA_ROOT,
  MULTIPLE_CONFIG_PATH,
} from './lib';

import { readConfigFile } from '../../../../src/functional_test_runner/lib';

// Takes in a config listing multiple configs
// [x] 'test/functional/config.js'
// [x] 'test/api_integration/config.js'
// [ ] 'test/integration/config.js' (http server tests)
// from x-pack-kibana:
// [x] 'test/functional/config.js'
// [x] 'test/api_integration/config.js'
// [x] 'test/saml_api_integration/config.js'
export async function runTests(
  configPath = MULTIPLE_CONFIG_PATH,
  runEs = runElasticsearch,
  runKbn = runKibanaServer,
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
  configPath = 'test/functional/config.js',
  runEs = runElasticsearch,
  runKbn = runKibanaServer,
) {

  // TODO: make note about change to saml option
  const configOption = getopts(process.argv.slice(2)).config;

  configPath = await resolve(KIBANA_ROOT, configOption || configPath);

  await withTmpDir(async tmpDir => {
    await withProcRunner(async procs => {
      const config = await readConfigFile(log, configPath);

      await runEs({ tmpDir, procs, config });
      await runKbn({ procs, config });

      // Maybe log something here?

      await procs.waitForAllToStop();
    });
  });
}

// Start servers and run tests for single config
// TODO: doesn't work to pass in config via command line
// TODO: don't export this--
export async function runWithConfig(
  configPath = 'test/functional/config.js',
  runEs = runElasticsearch,
  runKbn = runKibanaServer,
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
    console.log('configOption', configOption);
    return resolve(KIBANA_ROOT, configOption || configPath);
  } else {
  // process was started in runTests or other method, so don't parse argv
    console.log('configPath', configPath);
    return resolve(KIBANA_ROOT, configPath);
  }
}

function fatalErrorHandler(err) {
  log.error('FATAL ERROR');
  log.error(isCliError(err) ? err.message : err);
  process.exit(1);
}
