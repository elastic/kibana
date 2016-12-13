import rimraf from 'rimraf';
import fs from 'fs';

export function cleanPrevious(settings, logger) {
  return new Promise(function (resolve, reject) {
    try {
      fs.statSync(settings.workingPath);

      logger.log('Found previous install attempt. Deleting...');
      try {
        rimraf.sync(settings.workingPath);
      } catch (e) {
        reject(e);
      }
      resolve();
    } catch (e) {
      if (e.code !== 'ENOENT') reject(e);

      resolve();
    }
  });
}

export function cleanArtifacts(settings) {
  // delete the working directory.
  // At this point we're bailing, so swallow any errors on delete.
  try {
    rimraf.sync(settings.workingPath);
    rimraf.sync(settings.plugins[0].path);
  }
  catch (e) {} // eslint-disable-line no-empty
}
