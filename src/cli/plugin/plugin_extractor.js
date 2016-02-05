import zipExtract from './extractors/zip';
import tarGzExtract from './extractors/tar_gz';

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
