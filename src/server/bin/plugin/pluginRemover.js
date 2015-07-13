var fs = require('fs');
var rimraf = require('rimraf');

module.exports = {
  remove: remove
};

function remove(settings, logger) {
  try {
    try {
      fs.statSync(settings.pluginPath);
    }
    catch (e) {
      logger.log('Plugin ' + settings.package + ' does not exist.');
      return;
    }

    logger.log('Removing ' + settings.package + '...');

    rimraf.sync(settings.pluginPath);
  } catch (err) {
    var message = 'Unable to remove plugin "' + settings.package + '" because of error: "' + err.message + '"';
    logger.error(message);
    process.exit(74);
  }
}