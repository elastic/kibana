module.exports = function (program) {
  var expiry = require('expiry-js');
  var downloadAndExpand = require('./downloadAndExpand.js');
  var npmInstall = require('./npmInstall.js');
  var baseUrl = 'https://s3.amazonaws.com/jimtars/';
  var settings;

  function parseSeconds(val) {
    var result;

    try {
      //Is there is no unit specified, assume seconds
      var re = /([a-zA-Z]+)/g;
      if (!re.exec(val)) {
        val += 's';
      }

      var timeVal = expiry(val);
      result = timeVal.asSeconds();
    } catch (ex) { }

    return result;
  }

  function parseSettings(options) {
    var settings = {
      timeout: 0,
      silent: false
    };

    if (options.timeout) {
      settings.timeout = options.timeout;
    }

    if (options.silent) {
      settings.silent = options.silent;
    }

    if (options.install) {
      settings.action = 'install';
      settings.plugin = options.install;
    }

    if (options.remove) {
      settings.action = 'remove';
      settings.plugin = options.remove;
    }

    return settings;
  }

  function log(message) {
    if (settings.silent) return;

    process.stdout.write(message);
  }

  function downloadLogger(progress, docInfo) {
    var totalBytes = docInfo.total;
    var runningTotal = 0;

    log(docInfo.message + '\n');

    progress.on('progress', function (data) {
      runningTotal += data;
      var percent = Math.round(runningTotal / totalBytes * 100);
      if (percent % 10 === 0) {
        log('.');
      }
    });

    progress.on('message', function (message) {
      log(message);
    });
  }

  function processCommand(command, options) {
    settings = parseSettings(command);

    if (!settings.action) {
      console.error('Please specify either --install or --remove.');
      process.exit(1);
    }

    if (settings.action === 'install') {
      //require('./plugin_install.js')(settings);
      log('Running download and install.\n');
      var sourceUrl = 'https://download.elastic.co/kibana/plugins/test-plugin-1.0.0.tgz';
      var destPath = './plugins/' + settings.plugin;

      downloadAndExpand(sourceUrl, destPath, downloadLogger)
      .catch(function (e) {
        console.error('Error installing plugin: ' + e);
      })
      .then(function () {
        npmInstall(destPath);
      });
    }
  }

  program
    .command('plugin')
    .description('Maintain Plugins')
    .option('-i, --install <plugin>', 'The plugin to install')
    .option('-r, --remove <plugin>', 'The plugin to remove')
    .option('-s, --silent', 'Disable process messaging')
    .option('-t, --timeout <duration>', 'Length of time before failing; 0 for never fail', parseSeconds)
    .action(processCommand);
};