var pluginDownloader = require('./pluginDownloader');
var pluginCleaner = require('./pluginCleaner');
var fs = require('fs');

module.exports = {
  install: install
};

function install(settings, logger) {
  logger.log(`Installing ${settings.package}`);

  try {
    fs.statSync(settings.pluginPath);

    logger.error(`Plugin ${settings.package} already exists, please remove before installing a new version`);
    process.exit(70); // eslint-disable-line no-process-exit
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  var cleaner = pluginCleaner(settings, logger);
  var downloader = pluginDownloader(settings, logger);

  return cleaner.cleanPrevious()
  .then(function () {
    return downloader.download();
  })
  .then(function (curious) {
    fs.renameSync(settings.workingPath, settings.pluginPath);
    logger.log('Plugin installation complete');
  })
  .catch(function (e) {
    logger.error(`Plugin installation was unsuccessful due to error "${e.message}"`);
    cleaner.cleanError();
    process.exit(70); // eslint-disable-line no-process-exit
  });
}
