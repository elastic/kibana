/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { savedObjectsMigrationConfig } from './saved_objects_config';

const validate = (config: Record<string, unknown>) =>
  savedObjectsMigrationConfig.schema.validate(config);

describe('migrations config', () => {
  describe.each(['discardUnknownObjects', 'discardCorruptObjects'])('%s', (flag) => {
    it.each([true, false, '9.7.0'])('accepts %p', (value) => {
      expect(validate({ [flag]: value })[flag as 'discardUnknownObjects']).toBe(value);
    });

    it('rejects strings that are not a semver', () => {
      expect(() => validate({ [flag]: 'always' })).toThrow(/not a valid semantic version/);
    });
  });
});
