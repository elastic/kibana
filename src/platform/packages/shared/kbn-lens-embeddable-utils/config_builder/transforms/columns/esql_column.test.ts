/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getValueColumn } from './esql_column';

describe('getValueColumn', () => {
  it('sets fieldName from the API column, falling back to the id', () => {
    expect(getValueColumn('id', { column: '??field' }).fieldName).toBe('??field');
    expect(getValueColumn('id').fieldName).toBe('id');
  });

  // The `??` prefix alone is ambiguous (a real column can be named `??x` via backtick quoting),
  // so the query-unaware helper never sets `variable`. That is stamped in `buildESQLLayer`.
  it('never reconstructs `variable` (that is query-aware, done in buildESQLLayer)', () => {
    expect(getValueColumn('id', { column: '??field' }).variable).toBeUndefined();
    expect(getValueColumn('id', { column: '?os' }).variable).toBeUndefined();
    expect(getValueColumn('id', { column: 'COUNT(*)' }).variable).toBeUndefined();
  });
});
