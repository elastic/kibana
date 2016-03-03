import fromRoot from '../../utils/fromRoot';
import list from './list';
import Logger from '../lib/logger';
import { parse } from './settings';

export default function pluginList(program) {
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
    list(settings, logger);
  }

  program
    .command('list')
    .option(
      '-d, --plugin-dir <path>',
      'The path to the directory where plugins are stored',
      fromRoot('installedPlugins')
    )
    .description('List installed plugins')
    .action(processCommand);
};
