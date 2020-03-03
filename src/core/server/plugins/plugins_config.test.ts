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

import { PluginsConfig, PluginsConfigType } from './plugins_config';
import { Env } from '../config';
import { getEnvOptions } from '../config/__mocks__/env';

describe('PluginsConfig', () => {
  it('retrieves additionalPluginPaths from config.paths when in production mode', () => {
    const env = Env.createDefault(getEnvOptions({ cliArgs: { dev: false } }));
    const rawConfig: PluginsConfigType = {
      initialize: true,
      paths: ['some-path', 'another-path'],
    };
    const config = new PluginsConfig(rawConfig, env);
    expect(config.additionalPluginPaths).toEqual(['some-path', 'another-path']);
  });

  it('retrieves additionalPluginPaths from config.paths when in development mode', () => {
    const env = Env.createDefault(getEnvOptions({ cliArgs: { dev: true } }));
    const rawConfig: PluginsConfigType = {
      initialize: true,
      paths: ['some-path', 'another-path'],
    };
    const config = new PluginsConfig(rawConfig, env);
    expect(config.additionalPluginPaths).toEqual(['some-path', 'another-path']);
  });
});
