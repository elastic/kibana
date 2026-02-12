/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getUnitLabel } from './get_unit_label';

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});

describe('getUnitLabel', () => {
  describe('undefined and special units of count', () => {
    it('returns "count" label when unit is undefined', () => {
      const result = getUnitLabel({ unit: undefined });
      expect(result).toBe('count');
    });

    it('returns original unit string for special units of count', () => {
      const unifiedCodeUnit = '{operations}';
      const result = getUnitLabel({ unit: unifiedCodeUnit });
      expect(result).toBe(unifiedCodeUnit);
    });
  });
});
