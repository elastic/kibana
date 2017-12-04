import list from './list';
import Logger from '../lib/logger';
import { parse } from './settings';
import logWarnings from '../lib/log_warnings';
import { pluginDirExplanation } from '../lib/plugin_dir';

function processCommand(command, options) {
  let settings;
  try {
    settings = parse(command, options);
  } catch (ex) {
    //The logger has not yet been initialized.
    console.error(ex.message);
    process.exit(64); // eslint-disable-line no-process-exit
  }

  const logger = new Logger(settings);
  logWarnings(settings, logger);
  list(settings, logger);
}

export default function pluginList(program) {
  program
    .command('list')
    .description('list installed plugins')
    .onUnknownOptions(['--plugin-dir', '-d'], () => {
      console.error(pluginDirExplanation);
      process.exit(1);
    })
    .action(processCommand);
}
