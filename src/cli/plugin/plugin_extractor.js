const zipExtract = require('./extractors/zip');
const tarGzExtract = require('./extractors/tar_gz');

export default function extractArchive(settings, logger, archiveType) {
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
