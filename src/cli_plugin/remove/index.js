import fromRoot from '../../utils/fromRoot';
import remove from './remove';
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
    remove(settings, logger);
  }

  program
  .command('remove <plugin>')
  .option('-q, --quiet', 'Disable all process messaging except errors')
  .option('-s, --silent', 'Disable all process messaging')
  .option(
    '-c, --config <path>',
    'Path to the config file',
    fromRoot('config/kibana.yml')
  )
  .option(
    '-d, --plugin-dir <path>',
    'The path to the directory where plugins are stored',
    fromRoot('installedPlugins')
  )
  .description('Remove a plugin',
`Common examples:
  remove xpack`)
  .action(processCommand);
};
