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
import { config } from './kibana_config';
import { applyDeprecations, configDeprecationFactory } from '@kbn/config';

const CONFIG_PATH = 'kibana';

const applyKibanaDeprecations = (settings: Record<string, any> = {}) => {
  const deprecations = config.deprecations!(configDeprecationFactory);
  const deprecationMessages: string[] = [];
  const _config: any = {};
  _config[CONFIG_PATH] = settings;
  const migrated = applyDeprecations(
    _config,
    deprecations.map((deprecation) => ({
      deprecation,
      path: CONFIG_PATH,
    })),
    (msg) => deprecationMessages.push(msg)
  );
  return {
    messages: deprecationMessages,
    migrated,
  };
};

it('set correct defaults ', () => {
  const configValue = config.schema.validate({});
  expect(configValue).toMatchInlineSnapshot(`
    Object {
      "autocompleteTerminateAfter": "PT1M40S",
      "autocompleteTimeout": "PT1S",
      "enabled": true,
      "index": ".kibana",
    }
  `);
});

describe('deprecations', () => {
  ['.foo', '.kibana'].forEach((index) => {
    it('logs a warning if index is set', () => {
      const { messages } = applyKibanaDeprecations({ index });
      expect(messages).toMatchInlineSnapshot(`
      Array [
        "Multitenancy by changing 'kibana.index' will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details",
      ]
    `);
    });
  });
});
