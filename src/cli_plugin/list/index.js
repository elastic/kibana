import { fromRoot } from '../../utils';
import list from './list';
import Logger from '../lib/logger';
import { parse } from './settings';
import logWarnings from '../lib/log_warnings';
import { warnIfUsingPluginDirOption } from '../lib/warn_if_plugin_dir_option';

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

  warnIfUsingPluginDirOption(settings, fromRoot('plugins'), logger);
  logWarnings(settings, logger);
  list(settings, logger);
}

export default function pluginList(program) {
  program
    .command('list')
    .option(
      '-d, --plugin-dir <path>',
      'path to the directory where plugins are stored (DEPRECATED, known to not work for all plugins)',
      fromRoot('plugins')
    )
    .description('list installed plugins')
    .action(processCommand);
}
