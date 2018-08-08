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
import { transformDeprecations } from './transform_deprecations';
import { unset, formatListAsProse, getFlattenedObject } from '../../utils';

const getFlattenedKeys = object => (
  Object.keys(getFlattenedObject(object))
);

const getUnusedConfigKeys = (disabledPluginSpecs, rawSettings, configValues) => {
  const settings = transformDeprecations(rawSettings);

  // remove config values from disabled plugins
  for (const spec of disabledPluginSpecs) {
    unset(settings, spec.getConfigPrefix());
  }

  const inputKeys = getFlattenedKeys(settings);
  const appliedKeys = getFlattenedKeys(configValues);

  if (inputKeys.includes('env')) {
    // env is a special case key, see https://github.com/elastic/kibana/blob/848bf17b/src/server/config/config.js#L74
    // where it is deleted from the settings before being injected into the schema via context and
    // then renamed to `env.name` https://github.com/elastic/kibana/blob/848bf17/src/server/config/schema.js#L17
    inputKeys[inputKeys.indexOf('env')] = 'env.name';
  }

  return difference(inputKeys, appliedKeys);
};

export default function (kbnServer, server, config) {

  server.decorate('server', 'config', function () {
    return kbnServer.config;
  });

  const unusedKeys = getUnusedConfigKeys(kbnServer.disabledPluginSpecs, kbnServer.settings, config.get())
    .map(key => `"${key}"`);

  if (!unusedKeys.length) {
    return;
  }

  const desc = unusedKeys.length === 1
    ? 'setting was'
    : 'settings were';

  const error = new Error(
    `${formatListAsProse(unusedKeys)} ${desc} not applied. ` +
    'Check for spelling errors and ensure that expected ' +
    'plugins are installed.'
  );

  error.code = 'InvalidConfig';
  error.processExitCode = 64;
  throw error;
}
