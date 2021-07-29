/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { savedObjectsMigrationConfig } from './saved_objects_config';
import { getDeprecationsFor } from '../config/test_utils';

const applyMigrationsDeprecations = (settings: Record<string, any> = {}) =>
  getDeprecationsFor({
    provider: savedObjectsMigrationConfig.deprecations!,
    settings,
    path: 'migrations',
  });

describe('migrations config', function () {
  describe('deprecations', () => {
    it('logs a warning if migrations.enableV2 is set: true', () => {
      const { messages } = applyMigrationsDeprecations({ enableV2: true });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "\\"migrations.enableV2\\" is deprecated and will be removed in an upcoming release without any further notice.",
        ]
      `);
    });

    it('logs a warning if migrations.enableV2 is set: false', () => {
      const { messages } = applyMigrationsDeprecations({ enableV2: false });
      expect(messages).toMatchInlineSnapshot(`
        Array [
          "\\"migrations.enableV2\\" is deprecated and will be removed in an upcoming release without any further notice.",
        ]
      `);
    });
  });

  it('does not log a warning if migrations.enableV2 is not set', () => {
    const { messages } = applyMigrationsDeprecations({ batchSize: 1_000 });
    expect(messages).toMatchInlineSnapshot(`Array []`);
  });
});
