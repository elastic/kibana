/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_ESQL_VIEW_NAME_LENGTH, validateEsqlViewName } from './esql_view_validation';

describe('validateEsqlViewName', () => {
  it('accepts names allowed by the Elasticsearch view API', () => {
    expect(validateEsqlViewName('sales.view-2026_data')).toBeUndefined();
    expect(validateEsqlViewName('sales@view=2026')).toBeUndefined();
  });

  it('requires a name', () => {
    expect(validateEsqlViewName('')).toBe('required');
  });

  it.each(['Sales-view', 'sales view', 'sales#view', '-sales-view', '.', '..'])(
    'rejects the invalid name %s',
    (name) => {
      expect(validateEsqlViewName(name)).toBe('invalidFormat');
    }
  );

  it('bounds the name length in UTF-8 bytes', () => {
    expect(validateEsqlViewName('a'.repeat(MAX_ESQL_VIEW_NAME_LENGTH + 1))).toBe('tooLong');
    expect(validateEsqlViewName('é'.repeat(128))).toBe('tooLong');
  });
});
