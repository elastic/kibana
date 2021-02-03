/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { difference } from 'lodash';
import { getFlattenedObject } from '@kbn/std';
import { hasConfigPathIntersection } from '../../config';
import { LegacyConfig, LegacyVars } from '../types';

const getFlattenedKeys = (object: object) => Object.keys(getFlattenedObject(object));

export async function getUnusedConfigKeys({
  coreHandledConfigPaths,
  settings,
  legacyConfig,
}: {
  coreHandledConfigPaths: string[];
  settings: LegacyVars;
  legacyConfig: LegacyConfig;
}) {
  const inputKeys = getFlattenedKeys(settings);
  const appliedKeys = getFlattenedKeys(legacyConfig.get());

  if (inputKeys.includes('env')) {
    // env is a special case key, see https://github.com/elastic/kibana/blob/848bf17b/src/legacy/server/config/config.js#L74
    // where it is deleted from the settings before being injected into the schema via context and
    // then renamed to `env.name` https://github.com/elastic/kibana/blob/848bf17/src/legacy/server/config/schema.js#L17
    inputKeys[inputKeys.indexOf('env')] = 'env.name';
  }

  // Filter out keys that are marked as used in the core (e.g. by new core plugins).
  return difference(inputKeys, appliedKeys).filter(
    (unusedConfigKey) =>
      !coreHandledConfigPaths.some((usedInCoreConfigKey) =>
        hasConfigPathIntersection(unusedConfigKey, usedInCoreConfigKey)
      )
  );
}
