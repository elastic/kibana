/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { config } from './kibana_config';
import { getDeprecationsFor } from './config/test_utils';

const CONFIG_PATH = 'kibana';

const applyKibanaDeprecations = (settings: Record<string, any> = {}) =>
  getDeprecationsFor({
    provider: config.deprecations!,
    settings,
    path: CONFIG_PATH,
  });

it('set correct defaults ', () => {
  const configValue = config.schema.validate({});
  expect(configValue).toMatchInlineSnapshot(`
    Object {
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
