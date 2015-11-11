const zipExtract = require('./extractors/zip');
const tarGzExtract = require('./extractors/tarGz');

module.exports = function (settings, logger, archiveType) {
  switch (archiveType) {
    case '.zip':
      return zipExtract(settings, logger);
      break;
    case '.tar.gz':
      return tarGzExtract(settings, logger);
      break;
    default:
      throw new Error('Unsupported archive format.');
  }
};
