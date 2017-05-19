import { resolve } from 'path';

import { Command } from 'commander';

import { createToolingLog } from '../utils';
import { createFunctionalTestRunner } from './functional_test_runner';

const cmd = new Command('node scripts/functional_test_runner');
const resolveConfigPath = v => resolve(process.cwd(), v);
const defaultConfigPath = resolveConfigPath('test/functional/config.js');

cmd
  .option('--config [path]', 'Path to a config file', resolveConfigPath, defaultConfigPath)
  .option('--bail', 'stop tests after the first failure', false)
  .option('--grep <pattern>', 'pattern used to select which tests to run')
  .option('--verbose', 'Log everything', false)
  .option('--quiet', 'Only log errors', false)
  .option('--silent', 'Log nothing', false)
  .option('--debug', 'Run in debug mode', false)
  .parse(process.argv);

let logLevel = 'info';
if (cmd.silent) logLevel = 'silent';
if (cmd.quiet) logLevel = 'error';
if (cmd.debug) logLevel = 'debug';
if (cmd.verbose) logLevel = 'verbose';

const log = createToolingLog(logLevel);
log.pipe(process.stdout);

const functionalTestRunner = createFunctionalTestRunner({
  log,
  configFile: cmd.config,
  configOverrides: {
    mochaOpts: {
      bail: cmd.bail,
      grep: cmd.grep,
    }
  }
});

async function run() {
  try {
    const failureCount = await functionalTestRunner.run();
    process.exitCode = failureCount ? 1 : 0;
  } catch (err) {
    // await teardown(err);
  } finally {
    // await teardown();
  }
}

let teardownRun = false;
async function teardown(err) {
  if (teardownRun) return;

  teardownRun = true;
  if (err) {
    log.indent(-log.indent());
    log.error(err);
    process.exitCode = 1;
  }

  try {
    await functionalTestRunner.close();
  } finally {
    process.exit();
  }
}

process.on('unhandledRejection', err => teardown(err));
process.on('SIGTERM', () => teardown());
process.on('SIGINT', () => teardown());
run();
