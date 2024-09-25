/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import { getArgValue } from './read_argv';

/**
 * Manually applies the specific configuration overrides we need to load the APM config.
 * Currently, only these are needed:
 *   - server.uuid
 *   - path.data
 */
export const applyConfigOverrides = (config: Record<string, any>, argv: string[]) => {
  const serverUuid = getArgValue(argv, '--server.uuid');
  if (serverUuid) {
    set(config, 'server.uuid', serverUuid);
  }
  const dataPath = getArgValue(argv, '--path.data');
  if (dataPath) {
    set(config, 'path.data', dataPath);
  }
};
