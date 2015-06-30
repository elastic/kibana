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

  program
    .command('plugin')
    .description('Maintain Plugins')
    .option('-i, --install <org>/<plugin>/<version>', 'The plugin to install')
    .option('-r, --remove <plugin>', 'The plugin to remove')
    .option('-s, --silent', 'Disable process messaging')
    .option('-u, --url <url>', 'Specify download url')
    .option('-t, --timeout <duration>', 'Length of time before failing; 0 for never fail', settingParser.parseMilliseconds)
    .action(processCommand);
};