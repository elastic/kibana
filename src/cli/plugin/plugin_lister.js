const fs = require('fs');

module.exports = {
  list: list
};

function list(settings, logger) {
  fs.readdir(settings.pluginDir, function (err, files) {

    var pluginFiles = files.filter(function (file) {
      return file[0] !== '.';
    });

    pluginFiles.forEach(function (pluginFile) {
      logger.log(pluginFile);
    });
  });
}
