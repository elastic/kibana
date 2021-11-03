/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { checkDatatableForPrecisionError } from './utils';
import type { Datatable } from '../../../../expressions';

describe('tabify utils', () => {
  describe('checkDatatableForPrecisionError', () => {
    test('should return true if there is a precision error in at least one column', () => {
      expect(
        checkDatatableForPrecisionError({
          columns: [
            {
              meta: {
                sourceParams: {
                  hasPrecisionError: false,
                },
              },
            },
            {
              meta: {
                sourceParams: {
                  hasPrecisionError: true,
                },
              },
            },
          ],
        } as unknown as Datatable)
      ).toBeTruthy();
    });
    test('should return false if there is no precision error column', () => {
      expect(
        checkDatatableForPrecisionError({
          columns: [
            {
              meta: {
                sourceParams: {
                  hasPrecisionError: false,
                },
              },
            },
            {
              meta: {
                sourceParams: {
                  hasPrecisionError: false,
                },
              },
            },
          ],
        } as unknown as Datatable)
      ).toBeFalsy();
    });
  });
});
