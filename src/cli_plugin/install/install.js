import _ from 'lodash';
import { download } from './download';
import Promise from 'bluebird';
import { cleanPrevious, cleanError } from './cleanup';
import { extract, readMetadata } from './zip';
import { sync as rimrafSync } from 'rimraf';
import { statSync, renameSync } from 'fs';
import { existingInstall, rebuildCache, checkVersion } from './kibana';

const mkdirp = Promise.promisify(require('mkdirp'));

export default async function install(settings, logger) {
  try {
    await cleanPrevious(settings, logger);

    await mkdirp(settings.workingPath);

    await download(settings, logger);

    await readMetadata(settings, logger);

    await extract (settings, logger);

    rimrafSync(settings.tempArchiveFile);

    existingInstall(settings, logger);

    checkVersion(settings);

    renameSync(settings.workingPath, settings.pluginPath);

    await rebuildCache(settings, logger);

    logger.log('Plugin installation complete');
  } catch (err) {
    logger.error(`Plugin installation was unsuccessful due to error "${err.message}"`);
    cleanError(settings);
    process.exit(70); // eslint-disable-line no-process-exit
  }
}
