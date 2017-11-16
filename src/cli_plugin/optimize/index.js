import { fromRoot } from '../../utils';
import optimize from './optimize';
import Logger from '../lib/logger';
import { parse } from './settings';
import logWarnings from '../lib/log_warnings';

function processCommand(command) {
  let settings;
  try {
    settings = parse(command);

  } catch (ex) {
    //The logger has not yet been initialized.
    console.error(ex.message);
    process.exit(64); // eslint-disable-line no-process-exit
  }

  const logger = new Logger(settings);
  logWarnings(settings, logger);
  optimize(settings, logger);
}

export default function pluginOptimize(program) {
  program
    .command('optimize')
    .option('-q, --quiet', 'disable all process messaging except errors')
    .option('-s, --silent', 'disable all process messaging')
    .option(
      '-d, --plugin-dir <path>',
      'path to the directory where plugins are stored',
      fromRoot('plugins')
    )
    .description('force the optimization for all plugins')
    .action(processCommand);
}
