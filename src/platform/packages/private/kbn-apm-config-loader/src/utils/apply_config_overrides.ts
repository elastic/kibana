/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import { getArgValue, getAllArgKeysValueWithPrefix } from './read_argv';

const CONFIG_PREFIXES = ['--elastic.apm', '--telemetry', '--monitoring_collection'];

/**
 * Manually applies the specific configuration overrides we need to load the APM config.
 * Currently, only these are needed:
 *   - server.uuid
 *   - path.data
 *   - elastic.apm.*
 *   - telemetry.*
 *   - monitoring_collection.*
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

  CONFIG_PREFIXES.forEach((prefix) => {
    getAllArgKeysValueWithPrefix(argv, prefix).forEach(([key, value]) => {
      if (typeof value === 'undefined') {
        value = 'true'; // Add support to boolean flags without values (i.e.: --telemetry.enabled)
      }
      set(config, key, value);
    });
  });
};
