const utils = require('requirefrom')('src/utils');
const fromRoot = utils('fromRoot');
const settingParser = require('./setting_parser');
const installer = require('./plugin_installer');
const remover = require('./plugin_remover');
const pluginLogger = require('./plugin_logger');

export default function pluginCli(program) {
  function processCommand(command, options) {
    let settings;
    try {
      settings = settingParser(command).parse();
    } catch (ex) {
      //The logger has not yet been initialized.
      console.error(ex.message);
      process.exit(64); // eslint-disable-line no-process-exit
    }

    const logger = pluginLogger(settings);

    if (settings.action === 'install') {
      installer.install(settings, logger);
    }
    if (settings.action === 'remove') {
      remover.remove(settings, logger);
    }
  }

  program
    .command('plugin')
    .option('-i, --install <org>/<plugin>/<version>', 'The plugin to install')
    .option('-r, --remove <plugin>', 'The plugin to remove')
    .option('-q, --quiet', 'Disable all process messaging except errors')
    .option('-s, --silent', 'Disable all process messaging')
    .option('-u, --url <url>', 'Specify download url')
    .option(
      '-c, --config <path>',
      'Path to the config file',
      fromRoot('config/kibana.yml')
    )
    .option(
      '-t, --timeout <duration>',
      'Length of time before failing; 0 for never fail',
      settingParser.parseMilliseconds
    )
    .option(
      '-d, --plugin-dir <path>',
      'The path to the directory where plugins are stored',
      fromRoot('installedPlugins')
    )
    .description(
      'Maintain Plugins',
`
  Common examples:
    -i username/sample
      attempts to download the latest version from the following url:
        https://download.elastic.co/username/sample/sample-latest.tar.gz

    -i username/sample/v1.1.1
      attempts to download version v1.1.1 from the following url:
        https://download.elastic.co/username/sample/sample-v1.1.1.tar.gz

    -i sample -u http://www.example.com/other_name.tar.gz
      attempts to download from the specified url,
      and installs the plugin found at that url as "sample"
`
    )
    .action(processCommand);
};
