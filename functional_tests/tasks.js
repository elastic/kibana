import { relative, resolve } from 'path';
import Rx from 'rxjs/Rx';
import { Command } from 'commander';
import { withProcRunner } from '@kbn/dev-utils';

import {
  withTmpDir,
  getFtrConfig,
  runKibanaServer,
  runEs,
  runEsWithXpack,
  runFtr,
  log,
  KIBANA_FTR_SCRIPT,
  isCliError,
} from './lib';

import { readConfigFile } from '../src/functional_test_runner/lib';
import { KIBANA_ROOT } from './lib/paths';

const SUCCESS_MESSAGE = `

Elasticsearch and Kibana are ready for functional testing. Start the functional tests
in another terminal session by running this command from this directory:

    node ${relative(process.cwd(), KIBANA_FTR_SCRIPT)}

`;

export function fatalErrorHandler(err) {
  log.error('FATAL ERROR');
  log.error(isCliError(err) ? err.message : err);
  process.exit(1);
}

export function runFunctionTests() {
  withTmpDir(async tmpDir => {
    await withProcRunner(async procs => {
      const ftrConfig = await getFtrConfig();

      await runEsWithXpack({ tmpDir, procs, ftrConfig });
      await runKibanaServer({ procs, ftrConfig });
      await runFtr({ procs });

      await procs.stop('kibana');
      await procs.stop('es');
    });
  })
    .catch(fatalErrorHandler);
}

export async function newRunApiTests() {
  await runWithConfig([
    '../../test/api_integration/config.js',
    '../../test/saml_api_integration/config.js',
  ]);
}

// TODO: be able to chain multiple configs
// Takes in multiple paths
// configPath should be paths
// works with '../test/functional/config.js'
// try with '../test/api_integration/config.js'
// try with '../test/http_server_integration/config.js'
// from x-pack-kibana:
// try with '../test/api_integration/config.js'
// try with '../test/saml_api_integration/config.js'
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
        // NOTE: enableUI, useSAML, devMode
        await runKibanaServer({ procs, config });
        await runFtr({ procs, configPath });

        await procs.stop('kibana');
        await procs.stop('es');
      });
    });
  } catch (err) {
    console.log('error running with config', err);
  }
}

// Takes in only one configPath
// Only start servers
async function startWithConfig(configPath) {
  await withTmpDir(async tmpDir => {
    await withProcRunner(async procs => {
      const config = require(configPath);

      await runEs({ tmpDir, procs, config });
      await runKibanaServer({ procs, config });

      // Maybe log something here?
      // Maybe emit an event here?

      await procs.waitForAllToStop();
    });
  });
}

export async function runApiTests() {
  try {
    await withTmpDir(async tmpDir => {
      await withProcRunner(async procs => {
        const ftrConfig = await getFtrConfig();

        await runEsWithXpack({ tmpDir, procs, ftrConfig });
        await runKibanaServer({ procs, ftrConfig, enableUI: false });
        await runFtr({ procs, configPath: require.resolve('../../test/api_integration/config.js') });

        await procs.stop('kibana');
        await procs.stop('es');

        // Run SAML specific API integration tests.
        await runEsWithXpack({ tmpDir, procs, ftrConfig, useSAML: true });
        await runKibanaServer({ procs, ftrConfig, enableUI: false, useSAML: true });
        await runFtr({ procs, configPath: require.resolve('../../test/saml_api_integration/config.js') });

        await procs.stop('kibana');
        await procs.stop('es');
      });
    });
  } catch(err) {
    fatalErrorHandler(err);
  }
}

export async function runFunctionalTestsServer() {
  const cmd = new Command('node scripts/functional_test_server');

  cmd
    .option('--saml', 'Run Elasticsearch and Kibana with configured SAML security realm', false)
    .parse(process.argv);

  const useSAML = cmd.saml;

  try {
    await withTmpDir(async tmpDir => {
      await withProcRunner(async procs => {
        withTests(async tests => {
          const ftrConfig = await getFtrConfig();
          await runEsWithXpack({ tmpDir, procs, ftrConfig, useSAML });
          await runKibanaServer({ devMode: true, procs, ftrConfig, useSAML });

          if (tests) {
            runTests(tests);
          }

          // wait for 5 seconds of silence before logging the success message
          // so that it doesn't get burried
          await Rx.Observable.fromEvent(log, 'data')
            .switchMap(() => Rx.Observable.timer(5000))
            .first()
            .toPromise();

          log.info(SUCCESS_MESSAGE);
          await procs.waitForAllToStop();
        });
      });
    });
  } catch(err) {
    fatalErrorHandler(err);
  }
}
