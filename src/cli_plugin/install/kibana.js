/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import path from 'path';
import { statSync } from 'fs';

import { versionSatisfies, cleanVersion } from '../../legacy/utils/version';

export function existingInstall(settings, logger) {
  try {
    statSync(path.join(settings.pluginDir, settings.plugins[0].id));

    logger.error(
      `Plugin ${settings.plugins[0].id} already exists, please remove before installing a new version`
    );
    process.exit(70);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
}

export function assertVersion(settings) {
  if (!settings.plugins[0].kibanaVersion) {
    throw new Error(
      `Plugin kibana.json is missing both a version property (required) and a kibanaVersion property (optional).`
    );
  }

  const actual = cleanVersion(settings.plugins[0].kibanaVersion);
  const expected = cleanVersion(settings.version);
  if (!versionSatisfies(actual, expected)) {
    throw new Error(
      `Plugin ${settings.plugins[0].id} [${actual}] is incompatible with Kibana [${expected}]`
    );
  }
}
