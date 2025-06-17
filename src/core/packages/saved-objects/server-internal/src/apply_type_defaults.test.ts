/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { globalSwitchToModelVersionAt } from '@kbn/core-saved-objects-base-server-internal';
import { applyTypeDefaults } from './apply_type_defaults';

const createType = (parts: Partial<SavedObjectsType> = {}): SavedObjectsType => ({
  name: 'test',
  namespaceType: 'single',
  hidden: false,
  mappings: { properties: {} },
  ...parts,
});

describe('applyTypeDefaults', () => {
  describe('switchToModelVersionAt', () => {
    it(`keeps the type's switchToModelVersionAt if lesser than the global version`, () => {
      const type = createType({
        switchToModelVersionAt: '8.4.0',
      });

      const result = applyTypeDefaults(type);
      expect(result.switchToModelVersionAt).toEqual('8.4.0');
    });

    it(`sets switchToModelVersionAt to the global version if unspecified`, () => {
      const type = createType({
        switchToModelVersionAt: undefined,
      });

      const result = applyTypeDefaults(type);
      expect(result.switchToModelVersionAt).toEqual(globalSwitchToModelVersionAt);
    });

    it(`throws if switchToModelVersionAt is invalid`, () => {
      const type = createType({
        switchToModelVersionAt: 'foobar',
      });

      expect(() => applyTypeDefaults(type)).toThrowErrorMatchingInlineSnapshot(
        `"Type test: invalid switchToModelVersionAt provided: foobar"`
      );
    });

    it(`throws if type version is greater than the global version`, () => {
      const type = createType({
        switchToModelVersionAt: '9.2.0',
      });

      expect(() => applyTypeDefaults(type)).toThrowErrorMatchingInlineSnapshot(
        `"Type test: provided switchToModelVersionAt (9.2.0) is higher than maximum (8.10.0)"`
      );
    });
  });
});
