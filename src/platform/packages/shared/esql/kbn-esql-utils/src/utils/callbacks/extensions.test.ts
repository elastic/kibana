/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { analyzeSourceQuery } from './extensions';

describe('analyzeSourceQuery', () => {
  it('returns undefined for an empty query', () => {
    expect(analyzeSourceQuery('')).toBeUndefined();
  });

  it('returns undefined while the source is still being typed', () => {
    expect(analyzeSourceQuery('FROM k')).toBeUndefined();
    expect(analyzeSourceQuery('FROM logs-*')).toBeUndefined();
  });

  it('returns the index pattern and command once the source is complete', () => {
    expect(analyzeSourceQuery('FROM logs-* ')).toEqual({
      indexPattern: 'logs-*',
      commandName: 'FROM',
    });
  });

  it('handles TS queries', () => {
    expect(analyzeSourceQuery('TS metrics-* ')).toEqual({
      indexPattern: 'metrics-*',
      commandName: 'TS',
    });
  });

  it('handles multiple sources', () => {
    expect(analyzeSourceQuery('FROM logs-*, metrics-* ')).toEqual({
      indexPattern: 'logs-*,metrics-*',
      commandName: 'FROM',
    });
  });

  it('returns the pattern when query has a pipe after the source', () => {
    expect(analyzeSourceQuery('FROM logs-* | WHERE x > 5')).toEqual({
      indexPattern: 'logs-*',
      commandName: 'FROM',
    });
  });
});
