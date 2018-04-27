import { download } from './download';
import Promise from 'bluebird';
import path from 'path';
import { cleanPrevious, cleanArtifacts } from './cleanup';
import { extract, getPackData } from './pack';
import { renamePlugin } from './rename';
import { sync as rimrafSync } from 'rimraf';
import { errorIfXPackInstall } from '../lib/error_if_x_pack';
import { existingInstall, rebuildCache, assertVersion } from './kibana';
import { prepareExternalProjectDependencies } from '@kbn/pm';
import mkdirp from 'mkdirp';

const mkdir = Promise.promisify(mkdirp);

export default async function install(settings, logger) {
  try {
    errorIfXPackInstall(settings, logger);

    await cleanPrevious(settings, logger);

    await mkdir(settings.workingPath);

    await download(settings, logger);

    await getPackData(settings, logger);

    await extract(settings, logger);

    rimrafSync(settings.tempArchiveFile);

    existingInstall(settings, logger);

    assertVersion(settings);

    await prepareExternalProjectDependencies(settings.workingPath);

    await renamePlugin(settings.workingPath, path.join(settings.pluginDir, settings.plugins[0].name));

    await rebuildCache(settings, logger);

    logger.log('Plugin installation complete');
  } catch (err) {
    logger.error(`Plugin installation was unsuccessful due to error "${err.message}"`);
    cleanArtifacts(settings);
    process.exit(70); // eslint-disable-line no-process-exit
  }
}
