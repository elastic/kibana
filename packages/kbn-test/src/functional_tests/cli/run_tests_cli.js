import getopts from 'getopts';
import { runTests } from '../../';
import {
  FUNCTIONAL_CONFIG_PATH,
  API_CONFIG_PATH,
} from '../../functional_tests/lib';

const defaultConfigPaths = [FUNCTIONAL_CONFIG_PATH, API_CONFIG_PATH];

/**
 * Run servers and tests for each config
 * Only cares about --config option. Other options
 * are passed directly to functional_test_runner, such as
 * --bail, --verbose, etc.
 * In the future, this method will accept --tests-only,
 * --servers-only.
 * @param {configPaths}     array of paths to configs
 */
export function runTestsCli() {
  const {
    configs,
    help,
  } = processArgv();

  if (help) return displayHelp();

  runTests(configs);
}


function processArgv() {
  const options = getopts(process.argv.slice(2)) || {};
  const configs = [];

  try {
    let configOptions = options.config;
    configOptions = typeof configOptions === 'string'
      ? [configOptions]
      : configOptions;
    configs.push(...configOptions);
  } catch (err) {
    configs.push(...defaultConfigPaths);
  }

  return {
    configs,
    help: options.help,
    rest: options._,
  };
}


function displayHelp() {
  console.log();
  console.log('Functional Tests');
  console.log('Usage:  node scripts/functional_tests [options]');
  console.log();
  console.log('--config      Option to pass in a config');
  console.log('              Can pass in multiple configs with');
  console.log('              --config file1 --config file2 --config file3');
  console.log('--help        Displays this menu and exits');
  console.log();
}
