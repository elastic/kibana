import zipExtract from './extractors/zip';
import tarGzExtract from './extractors/tar_gz';
import { ZIP, TAR } from './file_type';

export default function extractArchive(settings, logger, archiveType) {
  switch (archiveType) {
    case ZIP:
      return zipExtract(settings, logger);
      break;
    case TAR:
      return tarGzExtract(settings, logger);
      break;
    default:
      throw new Error('Unsupported archive format.');
  }
};
