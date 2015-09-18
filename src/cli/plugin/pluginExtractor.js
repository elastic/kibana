var zipExtract = require('./extractors/zip');
var tarGzExtract = require('./extractors/tarGz');

module.exports = function (settings, logger, archiveType) {
  switch (archiveType) {
    case '.zip':
      return zipExtract(settings, logger);
      break;
    case '.tar.gz':
      return tarGzExtract(settings, logger);
      break;
  }
};
