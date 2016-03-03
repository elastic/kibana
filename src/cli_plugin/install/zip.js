import _ from 'lodash';
import DecompressZip from '@bigfunger/decompress-zip';

//***********************************************
//Creates a filter function to be consumed by extractFiles
//
//filter: an object with either a files or paths property.
//filter.files: an array of full file paths to extract. Should match
//  exactly a value from listFiles
//filter.paths: an array of root paths from the archive. All files and
//  folders will be extracted recursively using these paths as roots.
//***********************************************
function extractFilter(filter) {
  if (filter.files) {
    const filterFiles = filter.files.map((file) => file.replace(/\\/g, '/'));
    return function filterByFiles(file) {
      if (file.type === 'SymbolicLink') return false;

      const path = file.path.replace(/\\/g, '/');
      return !!(_.indexOf(filterFiles, path) !== -1);
    };
  }

  if (filter.paths) {
    return function filterByRootPath(file) {
      if (file.type === 'SymbolicLink') return false;

      let include = false;
      filter.paths.forEach((path) => {
        const regex = new RegExp(`${path}($|/)`, 'i');
        if ((file.parent.match(regex)) && file.type !== 'SymbolicLink') {
          include = true;
        }
      });

      return include;
    };
  }

  return _.noop;
}

export async function extractFiles(zipPath, targetPath, strip, filter) {
  await new Promise((resolve, reject) => {
    const unzipper = new DecompressZip(zipPath);

    unzipper.on('error', reject);

    unzipper.extract({
      path: targetPath,
      strip: strip,
      filter: extractFilter(filter)
    });

    unzipper.on('extract', resolve);
  });
}

export async function listFiles(zipPath) {
  return await new Promise((resolve, reject) => {
    const unzipper = new DecompressZip(zipPath);

    unzipper.on('error', reject);

    unzipper.on('list', (files) => {
      resolve(files);
    });

    unzipper.list();
  });
}
