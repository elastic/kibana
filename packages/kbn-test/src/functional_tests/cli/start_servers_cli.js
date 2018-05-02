import getopts from 'getopts';
import { startServers } from '../../';
import { FUNCTIONAL_CONFIG_PATH } from '../../functional_tests/lib';

const defaultConfigPath = FUNCTIONAL_CONFIG_PATH;

/**
 * Start servers
 * @param {configPath}     path to config
 */
export function startServersCli() {
  const {
    config,
    help,
  } = processArgv();

  if (help) return displayHelp();

  startServers(config);
}


function processArgv() {
  const options = getopts(process.argv.slice(2)) || {};

  return {
    config: options.config || defaultConfigPath,
    help: options.help,
    rest: options._,
  };
}


function displayHelp() {
  console.log();
  console.log('Functional Tests\' Servers');
  console.log('Usage:  node scripts/functional_tests_server [options]');
  console.log();
  console.log('--config      Option to pass in a config');
  console.log('--help        Displays this menu and exits');
  console.log();
}

