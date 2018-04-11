import { resolve } from 'path';
// import Rx from 'rxjs/Rx';
import { Command } from 'commander';
import { withProcRunner } from '@kbn/dev-utils';

import {
  withTmpDir,
  runKibanaServer,
  runEs,
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
export async function runTests(configPath = 'test/multiple_config.js') {
  const cmd = new Command('node scripts/functional_test_with_configs');

  cmd
    .option('--config [value]', 'Path to config file to specify options', null)
    .parse(process.argv);

  configPath = await resolve(KIBANA_ROOT, cmd.config || configPath);
  try {
    const config = require(configPath)();

    for (const configFile of config.configFiles) {
      await runWithConfig(configFile);
    }
  } catch (err) {
    fatalErrorHandler(err);
  }
}

export async function runWithConfig(configPath = 'test/functional/config.js') {
  const cmd = new Command('node scripts/functional_test_with_config');

  cmd
    .option('--config [value]', 'Path to config file to specify options', null)
    .parse(process.argv);

  configPath = resolve(KIBANA_ROOT, cmd.config || configPath);

  try {
    await withTmpDir(async tmpDir => {
      await withProcRunner(async procs => {
        const config = await readConfigFile(log, configPath);

        await runEs({ tmpDir, procs, config }); // can also run with xpack
        await runKibanaServer({ procs, config });
        await runFtr({ procs, configPath });

        await procs.stop('kibana');
        await procs.stop('es');
      });
    });
  } catch (err) {
    fatalErrorHandler(err);
  }
}

// Takes in only one configPath
// Only start servers
export async function startWithConfig(configPath) {
  await withTmpDir(async tmpDir => {
    await withProcRunner(async procs => {
      const config = require(configPath);

      await runEs({ tmpDir, procs, config });
      await runKibanaServer({ procs, config });

      // Maybe log something here?
      // Maybe emit an event here?
    });
  });
}
