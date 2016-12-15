import _ from 'lodash';
import DecompressZip from '@bigfunger/decompress-zip';

const SYMBOLIC_LINK = 'SymbolicLink';

/**
 * Creates a filter function to be consumed by extractFiles that filters by
 *  an array of files
 * @param {array} files - an array of full file paths to extract. Should match
 *   exactly a value from listFiles
 */
function extractFilterFromFiles(files) {
  const filterFiles = files.map((file) => file.replace(/\\/g, '/'));
  return function filterByFiles(file) {
    if (file.type === SYMBOLIC_LINK) return false;

    const path = file.path.replace(/\\/g, '/');
    return _.includes(filterFiles, path);
  };
}

/**
 * Creates a filter function to be consumed by extractFiles that filters by
 *  an array of root paths
 * @param {array} paths - an array of root paths from the archive. All files and
 *   folders will be extracted recursively using these paths as roots.
 */
function extractFilterFromPaths(paths) {
  return function filterByRootPath(file) {
    if (file.type === SYMBOLIC_LINK) return false;

    return paths.some(path => {
      const regex = new RegExp(`${path}($|/)`, 'i');
      return file.parent.match(regex);
    });
  };
}

/**
 * Creates a filter function to be consumed by extractFiles
 * @param {object} filter - an object with either a files or paths property.
 */
function extractFilter(filter) {
  if (filter.files) return extractFilterFromFiles(filter.files);
  if (filter.paths) return extractFilterFromPaths(filter.paths);
  return _.noop;
}

/**
 * Extracts files from a zip archive to a file path using a filter function
 * @param {string} zipPath - file path to a zip archive
 * @param {string} targetPath - directory path to where the files should
 *  extracted
 * @param {integer} strip - Number of nested directories within the archive
 *  that should be ignored when determining the target path of an archived
 *  file.
 * @param {function} filter - A function that accepts a single parameter 'file'
 *  and returns true if the file should be extracted from the archive
 */
export async function extractFiles(zipPath, targetPath, strip, filter) {
  await new Promise((resolve, reject) => {
    const unzipper = new DecompressZip(zipPath);

    unzipper.on('error', reject);

    const options = {
      path: targetPath,
      strip: strip
    };
    if (filter) {
      options.filter = extractFilter(filter);
    }

    unzipper.extract(options);

    unzipper.on('extract', resolve);
  });
}

/**
 * Returns all files within an archive
 * @param {string} zipPath - file path to a zip archive
 * @returns {array} all files within an archive with their relative paths
 */
export async function listFiles(zipPath) {
  return await new Promise((resolve, reject) => {
    const unzipper = new DecompressZip(zipPath);

    unzipper.on('error', reject);

    unzipper.on('list', (files) => {
      files = files.map((file) => file.replace(/\\/g, '/'));
      resolve(files);
    });

    unzipper.list();
  });
}
