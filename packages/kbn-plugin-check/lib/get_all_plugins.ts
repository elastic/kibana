/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findPlugins } from '@kbn/docs-utils';
import { ToolingLog } from '@kbn/tooling-log';

/**
 * Utility method for finding and logging information about all plugins.
 */
export const getAllPlugins = (log: ToolingLog) => {
  const plugins = findPlugins().filter((plugin) => plugin.isPlugin);
  log.info(`Found ${plugins.length} plugins.`);
  log.debug('Found plugins:', plugins);
  return plugins;
};
