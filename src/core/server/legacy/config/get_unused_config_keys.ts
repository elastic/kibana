/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
