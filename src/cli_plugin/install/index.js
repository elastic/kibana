import { fromRoot } from '../../utils';
import fs from 'fs';
import install from './install';
import Logger from '../lib/logger';
import pkg from '../../utils/package_json';
import { parse, parseMilliseconds } from './settings';

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
  install(settings, logger);
}

function getDefaultConfigPath() {
  const paths = [
    fromRoot('config/kibana.yml'),
    '/etc/kibana/kibana.yml'
  ];

  let defaultPath = paths[0];
  paths.some(configPath => {
    try {
      fs.accessSync(configPath, fs.R_OK);
      defaultPath = configPath;
      return true;
    } catch (e) {
      //Check the next path
    }
  });
  return defaultPath;
}

export default function pluginInstall(program) {
  program
  .command('install <plugin/url>')
  .option('-q, --quiet', 'disable all process messaging except errors')
  .option('-s, --silent', 'disable all process messaging')
  .option(
    '-c, --config <path>',
    'path to the config file',
    getDefaultConfigPath()
  )
  .option(
    '-t, --timeout <duration>',
    'length of time before failing; 0 for never fail',
    parseMilliseconds
  )
  .option(
    '-d, --plugin-dir <path>',
    'path to the directory where plugins are stored',
    fromRoot('installedPlugins')
  )
  .description('install a plugin',
`Common examples:
  install x-pack
  install file:///Path/to/my/x-pack.zip
  install https://path.to/my/x-pack.zip`)
  .action(processCommand);
};
