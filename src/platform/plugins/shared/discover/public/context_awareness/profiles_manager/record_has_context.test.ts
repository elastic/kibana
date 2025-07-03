/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { recordHasContext } from './record_has_context';
import { getDataTableRecordMock } from '@kbn/discover-utils/src/__mocks__';
import { getDataTableRecordWithContextMock } from '../__mocks__/data_table_record_with_context';

describe('recordHasContext', () => {
  it('should return false when record is undefined', () => {
    const result = recordHasContext(undefined);
    expect(result).toBe(false);
  });

  it('should return true when record has context property', () => {
    const recordWithContext = getDataTableRecordWithContextMock();

    const result = recordHasContext(recordWithContext);
    expect(result).toBe(true);
  });

  it('should return false when record does not have context property', () => {
    const recordWithoutContext = getDataTableRecordMock();

    const result = recordHasContext(recordWithoutContext);
    expect(result).toBe(false);
  });
});
