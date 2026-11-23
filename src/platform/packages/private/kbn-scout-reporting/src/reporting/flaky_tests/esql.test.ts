/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inList, quoteEsqlString } from './esql';

describe('quoteEsqlString', () => {
  it('wraps the value in double quotes', () => {
    expect(quoteEsqlString('kibana-on-merge')).toBe('"kibana-on-merge"');
  });

  it('escapes backslashes and double quotes', () => {
    expect(quoteEsqlString('say "hi" \\ bye')).toBe('"say \\"hi\\" \\\\ bye"');
  });
});

describe('inList', () => {
  it('joins quoted values with commas', () => {
    expect(inList(['main', '9.2'])).toBe('"main", "9.2"');
  });

  it('returns an empty string for no values', () => {
    expect(inList([])).toBe('');
  });
});
