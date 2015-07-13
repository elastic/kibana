var settingParser = require('./settingParser');
var installer = require('./pluginInstaller');
var remover = require('./pluginRemover');
var pluginLogger = require('./pluginLogger');

module.exports = function (program) {
  function processCommand(command, options) {
    var settings;
    try {
      settings = settingParser.parse(command);
    } catch (ex) {
      //The logger has not yet been initialized.
      console.error(ex.message);
      process.exit(64);
    }

    var logger = pluginLogger(settings.silent);

    if (settings.action === 'install') {
      installer.install(settings, logger);
    }
    if (settings.action === 'remove') {
      remover.remove(settings, logger);
    }
  }

  var installDesc =
    'The plugin to install\n\n' +
    '\tCommon examples:\n' +
    '\t  -i username/sample\n' +
    '\t    attempts to download the latest version from the following urls:\n' +
    '\t      https://download.elastic.co/username/sample/sample-latest.tar.gz\n' +
    '\t      https://github.com/username/sample/archive/master.tar.gz\n\n' +
    '\t  -i username/sample/v1.1.1\n' +
    '\t    attempts to download from the following urls:\n' +
    '\t      https://download.elastic.co/username/sample/sample-v1.1.1.tar.gz\n' +
    '\t      https://github.com/username/sample/archive/v1.1.1.tar.gz\n\n' +
    '\t  -i sample -u http://www.example.com/other_name.tar.gz\n' +
    '\t    attempts to download from the specified url,\n' +
    '\t    and installs the plugin found at that url as "sample"' +
    '\n';

  program
    .command('plugin')
    .description('Maintain Plugins')
    .option('-i, --install <org>/<plugin>/<version>', installDesc)
    .option('-r, --remove <plugin>', 'The plugin to remove')
    .option('-s, --silent', 'Disable process messaging')
    .option('-u, --url <url>', 'Specify download url')
    .option('-t, --timeout <duration>', 'Length of time before failing; 0 for never fail', settingParser.parseMilliseconds)
    .action(processCommand);
};