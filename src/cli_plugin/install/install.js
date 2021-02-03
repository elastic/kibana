/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Fs from 'fs';
import { promisify } from 'util';
import path from 'path';

import del from 'del';

import { download } from './download';
import { cleanPrevious, cleanArtifacts } from './cleanup';
import { extract, getPackData } from './pack';
import { renamePlugin } from './rename';
import { errorIfXPackInstall } from '../lib/error_if_x_pack';
import { existingInstall, assertVersion } from './kibana';

const mkdir = promisify(Fs.mkdir);

export async function install(settings, logger) {
  try {
    errorIfXPackInstall(settings, logger);

    await cleanPrevious(settings, logger);

    await mkdir(settings.workingPath, { recursive: true });

    await download(settings, logger);

    await getPackData(settings, logger);

    await extract(settings, logger);

    del.sync(settings.tempArchiveFile, { force: true });

    existingInstall(settings, logger);

    assertVersion(settings);

    const targetDir = path.join(settings.pluginDir, settings.plugins[0].id);
    await renamePlugin(settings.workingPath, targetDir);

    logger.log('Plugin installation complete');
  } catch (err) {
    logger.error(`Plugin installation was unsuccessful due to error "${err.message}"`);
    cleanArtifacts(settings);
    process.exit(70);
  }
}
