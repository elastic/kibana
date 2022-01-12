/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { checkColumnForPrecisionError } from './utils';
import type { DatatableColumn } from '../../../../expressions';

describe('tabify utils', () => {
  describe('checkDatatableForPrecisionError', () => {
    test('should return true if there is a precision error in the column', () => {
      expect(
        checkColumnForPrecisionError({
          meta: {
            sourceParams: {
              hasPrecisionError: true,
            },
          },
        } as unknown as DatatableColumn)
      ).toBeTruthy();
    });
    test('should return false if there is no precision error in the column', () => {
      expect(
        checkColumnForPrecisionError({
          meta: {
            sourceParams: {
              hasPrecisionError: false,
            },
          },
        } as unknown as DatatableColumn)
      ).toBeFalsy();
    });
    test('should return false if precision error is not defined', () => {
      expect(
        checkColumnForPrecisionError({
          meta: {
            sourceParams: {},
          },
        } as unknown as DatatableColumn)
      ).toBeFalsy();
    });
  });
});
