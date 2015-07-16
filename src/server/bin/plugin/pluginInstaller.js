var pluginDownloader = require('./pluginDownloader');
var pluginCleaner = require('./pluginCleaner');
var npmInstall = require('./npmInstall');
var fs = require('fs');

module.exports = {
  install: install
};

function install(settings, logger) {
  logger.log('installing ' + settings.package);

  try {
    fs.statSync(settings.pluginPath);

    logger.error('Plugin ' + settings.package + ' already exists. Please remove before installing a new version.');
    process.exit(70);
  } catch (e) {
    if (e.code !== 'ENOENT')
      throw e;
  }

  var cleaner = pluginCleaner(settings, logger);
  var downloader = pluginDownloader(settings, logger);

  return cleaner.cleanPrevious()
  .then(function () {
    return downloader.download();
  })
  .then(function () {
    return npmInstall(settings.workingPath, logger);
  })
  .then(function (curious) {
    fs.renameSync(settings.workingPath, settings.pluginPath);
    logger.log('Plugin installation complete!');
  })
  .catch(function (e) {
    logger.error('Plugin installation was unsuccessful due to error "' + e.message + '"');
    cleaner.cleanError();
    process.exit(70);
  });
}