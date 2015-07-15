var rimraf = require('rimraf');
var fs = require('fs');
var Promise = require('bluebird');

module.exports = function (settings, logger) {

  function cleanPrevious() {
    return new Promise(function (resolve, reject) {
      try {
        fs.statSync(settings.workingPath);

        logger.log('Found previous install attempt. Deleting...');
        try {
          rimraf.sync(settings.workingPath);
        } catch (e) {
          return reject(e);
        }
        return resolve();
      } catch (e) {
        if (e.code !== 'ENOENT')
          return reject(e);

        return resolve();
      }
    });
  }

  function cleanError() {
    //delete the working directory.
    //At this point we're bailing, so swallow any errors on delete.
    try {
      rimraf.sync(settings.workingPath);
    } catch (e) { }
  }

  return {
    cleanPrevious: cleanPrevious,
    cleanError: cleanError
  };
};