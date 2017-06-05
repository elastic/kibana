import { fromRoot } from '../../utils';
import install from './install';
import Logger from '../lib/logger';
import { pkg } from '../../utils';
import { getConfig } from '../../server/path';
import { parse, parseMilliseconds } from './settings';
import logWarnings from '../lib/log_warnings';

function processCommand(command, options) {
  let settings;
  try {
    settings = parse(command, options, pkg);
  } catch (ex) {
    //The logger has not yet been initialized.
    console.error(ex.message);
    process.exit(64); // eslint-disable-line no-process-exit
  }

  const logger = new Logger(settings);
  logWarnings(settings, logger);
  install(settings, logger);
}

export default function pluginInstall(program) {
  program
  .command('install <plugin/url>')
  .option('-q, --quiet', 'disable all process messaging except errors')
  .option('-s, --silent', 'disable all process messaging')
  .option(
    '-c, --config <path>',
    'path to the config file',
    getConfig()
  )
  .option(
    '-t, --timeout <duration>',
    'length of time before failing; 0 for never fail',
    parseMilliseconds
  )
  .option(
    '-d, --plugin-dir <path>',
    'path to the directory where plugins are stored',
    fromRoot('plugins')
  )
  .description('install a plugin',
`Common examples:
  install x-pack
  install file:///Path/to/my/x-pack.zip
  install https://path.to/my/x-pack.zip`)
  .action(processCommand);
}
