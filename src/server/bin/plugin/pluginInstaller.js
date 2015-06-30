var downloader = require('./pluginDownloader.js');
var cleaner = require('./pluginCleaner.js');
var npmInstall = require('./npmInstall.js');
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

  return cleaner.cleanPrevious(settings, logger)
  .then(function () {
    return downloader.download(settings, logger);
  })
  .then(function () {
    return npmInstall(settings.workingPath, logger);
  })
  .then(function (curious) {
    fs.renameSync(settings.workingPath, settings.pluginPath);
    logger.log('Plugin installation complete!');
  })
  .catch(function (e) {
    logger.error('Plugin installation was unsuccessful.');
    logger.error(e.message);
    cleaner.cleanError(settings);
    process.exit(70);
  });
}