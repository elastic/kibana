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
  it('reconstructs the ES|QL Control Variable from an Identifier Control column', () => {
    expect(getValueColumn('id', { column: '??field' }).variable).toBe('field');
    expect(getValueColumn('id', { column: '??field1' }).variable).toBe('field1');
    expect(getValueColumn('id', { column: '??function' }).variable).toBe('function');
  });

  it('does not set variable for Value Controls or ordinary columns', () => {
    expect(getValueColumn('id', { column: '?os' }).variable).toBeUndefined();
    expect(getValueColumn('id', { column: 'COUNT(*)' }).variable).toBeUndefined();
    expect(getValueColumn('id', { column: '??' }).variable).toBeUndefined();
  });
});
