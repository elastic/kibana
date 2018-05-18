import chalk from 'chalk';
import dedent from 'dedent';
import getopts from 'getopts';
import { createToolingLog, pickLevelFromFlags } from '@kbn/dev-utils';
import { startServers } from '../../';

/**
 * Start servers
 * @param {string} configPath path to config
 */
export async function startServersCli(defaultConfigPath) {
  const { config, log, help, installDir } = processArgv(defaultConfigPath);

  if (help) return displayHelp();

  if (!config) {
    log.error(
      `Start Servers requires one path to a config. Leave blank to use default.`
    );
    process.exit(1);
  }

  try {
    await startServers(config, { log, installDir });
  } catch (err) {
    log.error('FATAL ERROR');
    log.error(err);
    process.exit(1);
  }
}

function processArgv(defaultConfigPath) {
  const options = getopts(process.argv.slice(2)) || {};

  if (Array.isArray(options.config)) {
    console.log(
      chalk.red(
        `Starting servers requires a single config path. Multiple were passed.`
      )
    );
    process.exit(9);
  }

  const config =
    typeof options.config === 'string' ? options.config : defaultConfigPath;

  const log = createToolingLog(pickLevelFromFlags(options));
  log.pipe(process.stdout);

  return {
    config,
    log,
    installDir: options.kibanaInstallDir,
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
    --kibana-install-dir
                  Run Kibana from an existing install directory
                  Default: run from source
    --help        Display this menu and exit

    Log level options:

    --verbose
    --debug
    --quiet       Log errors
    --silent
    `)
  );
}
