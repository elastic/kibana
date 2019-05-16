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

import { difference, get, set } from 'lodash';
import { transformDeprecations } from './transform_deprecations';
import { unset, formatListAsProse, getFlattenedObject } from '../../utils';
import { getTransform } from '../../deprecation';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { hasConfigPathIntersection } from '../../../core/server/config/';

const getFlattenedKeys = object => Object.keys(getFlattenedObject(object));

async function getUnusedConfigKeys(
  coreHandledConfigPaths,
  plugins,
  disabledPluginSpecs,
  rawSettings,
  configValues
) {
  // transform deprecated core settings
  const settings = transformDeprecations(rawSettings);

  // transform deprecated plugin settings
  for (let i = 0; i < plugins.length; i++) {
    const { spec } = plugins[i];
    const transform = await getTransform(spec);
    const prefix = spec.getConfigPrefix();

    // nested plugin prefixes (a.b) translate to nested objects
    const pluginSettings = get(settings, prefix);
    if (pluginSettings) {
      // flattened settings are expected to be converted to nested objects
      // a.b = true => { a: { b: true }}
      set(settings, prefix, transform(pluginSettings));
    }
  }

  // remove config values from disabled plugins
  for (const spec of disabledPluginSpecs) {
    unset(settings, spec.getConfigPrefix());
  }

  const inputKeys = getFlattenedKeys(settings);
  const appliedKeys = getFlattenedKeys(configValues);

  if (inputKeys.includes('env')) {
    // env is a special case key, see https://github.com/elastic/kibana/blob/848bf17b/src/legacy/server/config/config.js#L74
    // where it is deleted from the settings before being injected into the schema via context and
    // then renamed to `env.name` https://github.com/elastic/kibana/blob/848bf17/src/legacy/server/config/schema.js#L17
    inputKeys[inputKeys.indexOf('env')] = 'env.name';
  }

  // Filter out keys that are marked as used in the core (e.g. by new core plugins).
  return difference(inputKeys, appliedKeys).filter(
    unusedConfigKey =>
      !coreHandledConfigPaths.some(usedInCoreConfigKey =>
        hasConfigPathIntersection(unusedConfigKey, usedInCoreConfigKey)
      )
  );
}

export default async function (kbnServer, server, config) {
  server.decorate('server', 'config', function () {
    return kbnServer.config;
  });

  const unusedKeys = await getUnusedConfigKeys(
    kbnServer.newPlatform.params.handledConfigPaths,
    kbnServer.plugins,
    kbnServer.disabledPluginSpecs,
    kbnServer.settings,
    config.get()
  );

  if (!unusedKeys.length) {
    return;
  }

  const formattedUnusedKeys = unusedKeys.map(key => `"${key}"`);
  const desc = formattedUnusedKeys.length === 1 ? 'setting was' : 'settings were';

  const error = new Error(
    `${formatListAsProse(formattedUnusedKeys)} ${desc} not applied. ` +
    'Check for spelling errors and ensure that expected ' +
    'plugins are installed.'
  );

  error.code = 'InvalidConfig';
  error.processExitCode = 64;
  throw error;
}
