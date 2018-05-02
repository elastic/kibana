import dedent from 'dedent';
import getopts from 'getopts';
import { createToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';
import { runTests } from '../../';

/**
 * Run servers and tests for each config
 * Only cares about --config option. Other options
 * are passed directly to functional_test_runner, such as
 * --bail, --verbose, etc.
 * In the future, this method will accept --tests-only,
 * --servers-only.
 * @param {string[]} defaultConfigPaths  Array of paths to configs to use
 *                                       if no config option is passed
 */
export function runTestsCli(defaultConfigPaths) {
  const { configs, help, bail, log } = processArgv(defaultConfigPaths);

  if (help) return displayHelp();

  runTests(configs, { bail, log });
}

function processArgv(defaultConfigPaths) {
  // If no args are passed, use {}
  const options = getopts(process.argv.slice(2)) || {};

  // If --config is passed without paths, it's "true", so use default
  const configs =
    typeof options.config === 'string' || Array.isArray(options.config)
      ? [].concat(options.config)
      : defaultConfigPaths;

  const log = createToolingLog(pickLevelFromFlags(options));
  log.pipe(process.stdout);

  return {
    configs,
    log,
    help: options.help,
    bail: options.bail,
    rest: options._,
  };
}

function displayHelp() {
  console.log(
    dedent(`
    Run Functional Tests

    Usage:  node scripts/functional_tests [options]

    --config      Option to pass in a config
                  Can pass in multiple configs with
                  --config file1 --config file2 --config file3
    --bail        Stop the test run at the first failure
    --help        Display this menu and exit

    Log level options:

    --verbose
    --debug
    --quiet       Log errors
    --silent
    `)
  );
}
