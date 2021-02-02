/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
        "\\"kibana.index\\" is deprecated. Multitenancy by changing \\"kibana.index\\" will not be supported starting in 8.0. See https://ela.st/kbn-remove-legacy-multitenancy for more details",
      ]
    `);
    });
  });
});
