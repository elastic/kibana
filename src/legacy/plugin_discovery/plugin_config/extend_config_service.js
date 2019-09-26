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

import { getSettings } from './settings';
import { getSchema, getStubSchema } from './schema';

/**
 *  Extend a config service with the schema and settings for a
 *  plugin spec and optionally call logDeprecation with warning
 *  messages about deprecated settings that are used
 *  @param  {PluginSpec} spec
 *  @param  {Server.Config} config
 *  @param  {Object} rootSettings
 *  @param  {Function} [logDeprecation]
 *  @return {Promise<undefined>}
 */
export async function extendConfigService(spec, config, rootSettings, logDeprecation) {
  const settings = await getSettings(spec, rootSettings, logDeprecation);
  const schema = await getSchema(spec);
  config.extendSchema(schema, settings, spec.getConfigPrefix());
}

/**
 *  Disable the schema and settings applied to a config service for
 *  a plugin spec
 *  @param  {PluginSpec} spec
 *  @param  {Server.Config} config
 *  @return {undefined}
 */
export function disableConfigExtension(spec, config) {
  const prefix = spec.getConfigPrefix();
  config.removeSchema(prefix);
  config.extendSchema(getStubSchema(), { enabled: false }, prefix);
}
