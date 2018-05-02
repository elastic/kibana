import chalk from 'chalk';
import dedent from 'dedent';
import getopts from 'getopts';
import { startServers } from '../../';

/**
 * Start servers
 * @param {string} configPath path to config
 */
export function startServersCli(defaultConfigPath) {
  const { config, help } = processArgv(defaultConfigPath);

  if (help) return displayHelp();

  startServers(config);
}

function processArgv(defaultConfigPath) {
  const options = getopts(process.argv.slice(2)) || {};

  if (Array.isArray(options.config)) {
    console.log(
      chalk.red(
        `Starting servers requires a single config path. Multiple were passed.`
      )
    );
    process.exit(1);
  }

  const config =
    typeof options.config === 'string' ? options.config : defaultConfigPath;

  return {
    config,
    help: options.help,
    rest: options._,
  };
}

function displayHelp() {
  console.log(
    dedent(`
    Start Functional Test Servers

    Usage:  node scripts/functional_tests_server [options]

    --config      Option to pass in a config
    --help        Display this menu and exit
    `)
  );
}
