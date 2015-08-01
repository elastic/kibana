var utils = require('requirefrom')('src/utils');
var fromRoot = utils('fromRoot');

var settingParser = require('./settingParser');
var installer = require('./pluginInstaller');
var remover = require('./pluginRemover');
var pluginLogger = require('./pluginLogger');

module.exports = function (program) {
  function processCommand(command, options) {
    var settings;
    try {
      settings = settingParser(command).parse();
    } catch (ex) {
      //The logger has not yet been initialized.
      console.error(ex.message);
      process.exit(64); // eslint-disable-line no-process-exit
    }

    var logger = pluginLogger(settings);

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
      attempts to download the latest version from the following urls:
        https://download.elastic.co/username/sample/sample-latest.tar.gz
        https://github.com/username/sample/archive/master.tar.gz

    -i username/sample/v1.1.1
      attempts to download version v1.1.1 from the following urls:
        https://download.elastic.co/username/sample/sample-v1.1.1.tar.gz
        https://github.com/username/sample/archive/v1.1.1.tar.gz

    -i sample -u http://www.example.com/other_name.tar.gz
      attempts to download from the specified url,
      and installs the plugin found at that url as "sample"
`
    )
    .action(processCommand);
};
