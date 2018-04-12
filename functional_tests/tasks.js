import { resolve } from 'path';
// import Rx from 'rxjs/Rx';
import { Command } from 'commander';
import { withProcRunner } from '@kbn/dev-utils';

import {
  withTmpDir,
  runKibanaServer,
  runElasticsearch,
  runFtr,
  log,
  isCliError,
  KIBANA_ROOT,
} from './lib';

import { readConfigFile } from '../src/functional_test_runner/lib';

export function fatalErrorHandler(err) {
  log.error('FATAL ERROR');
  log.error(isCliError(err) ? err.message : err);
  process.exit(1);
}

// Takes in a config listing multiple configs
// [x] 'test/functional/config.js'
// [x] 'test/api_integration/config.js'
// [ ] 'test/integration/config.js' (http server tests)
// from x-pack-kibana:
// [ ] 'test/api_integration/config.js'
// [ ] 'test/saml_api_integration/config.js'
export async function runTests(
  configPath = 'test/multiple_config.js',
  runEs = runElasticsearch,
  runKbn = runKibanaServer,
) {
  const cmd = new Command('node scripts/functional_test_with_configs');

  cmd
    .option('--config [value]', 'Path to config file to specify options', null)
    .parse(process.argv);

  configPath = await resolve(KIBANA_ROOT, cmd.config || configPath);

  try {
    const config = require(configPath)();

    for (const configFile of config.configFiles) {
      await runWithConfig(configFile, runEs, runKbn);
    }
  } catch (err) {
    fatalErrorHandler(err);
  }
}

function resolveConfigPath(configPath) {
  const cmd = new Command('node scripts/functional_test_with_config');
  // TODO: when --config multiple_config.js is passed into runTests
  // configPath is multiple_config.js, which is incorrectly passed here
  const originalCall = process.argv[1].split('/').slice(-1);
  // if this process was started in this method, parse argv
  if (originalCall === 'functional_test_with_config') {
    cmd
      .option('--config [value]', 'Path to config file to specify options', null)
      .parse(process.argv);

    return resolve(KIBANA_ROOT, cmd.config || configPath);
  } else {
  // process was started in another method, so don't parse argv
    return resolve(KIBANA_ROOT, configPath);
  }
}

// Start servers and run tests
// TODO: doesn't work to pass in config via command line
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

        await runEs({ tmpDir, procs, config }); // can also run with xpack
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

// Start only servers using single config
export async function startWithConfig(configPath) {
  await withTmpDir(async tmpDir => {
    await withProcRunner(async procs => {
      const config = require(configPath);

      await runElasticsearch({ tmpDir, procs, config });
      await runKibanaServer({ procs, config });

      // Maybe log something here?
      // Maybe emit an event here?
    });
  });
}
