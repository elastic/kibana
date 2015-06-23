module.exports = function (settings) {
  var downloadAndExpand = require('./downloadAndExpand.js');
  var npmInstall = require('./npmInstall.js');

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
};