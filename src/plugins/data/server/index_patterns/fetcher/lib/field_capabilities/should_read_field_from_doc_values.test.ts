/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { shouldReadFieldFromDocValues } from './should_read_field_from_doc_values';

describe('shouldReadFieldFromDocValues', () => {
  test('should read field from doc values for aggregatable "number" field', async () => {
    expect(shouldReadFieldFromDocValues(true, 'number')).toBe(true);
  });

  test('should not read field from doc values for non-aggregatable "number "field', async () => {
    expect(shouldReadFieldFromDocValues(false, 'number')).toBe(false);
  });

  test('should not read field from doc values for "text" field', async () => {
    expect(shouldReadFieldFromDocValues(true, 'text')).toBe(false);
  });

  test('should not read field from doc values for "geo_shape" field', async () => {
    expect(shouldReadFieldFromDocValues(true, 'geo_shape')).toBe(false);
  });

  test('should not read field from doc values for underscore field', async () => {
    expect(shouldReadFieldFromDocValues(true, '_source')).toBe(false);
  });
});
