import { basename, extname } from 'path';

export function isGzip(path) {
  return extname(path) === '.gz';
}

/**
 *  Check if a path is for a, potentially gzipped, mapping file
 *  @param  {String} path
 *  @return {Boolean}
 */
export function isMappingFile(path) {
  return basename(path, '.gz') === 'mappings.json';
}

/**
 *  Sorts the filenames found in an archive so that
 *  "mappings" files come first, which is the order they
 *  need to be imported so that data files will have their
 *  indexes before the docs are indexed.
 *
 *  @param {Array<String>} filenames
 *  @return {Array<String>}
 */
export function prioritizeMappings(filenames) {
  return filenames.slice().sort((fa, fb) => {
    if (isMappingFile(fa) === isMappingFile(fb)) return 0;
    return isMappingFile(fb) ? 1 : -1;
  });
}
