/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { prettifyQueryTemplate, prettifyQuery } from './utils';

describe('prettifyQueryTemplate', () => {
  it('should return empty string when query has no pipes', () => {
    const query = 'FROM logs';
    const result = prettifyQueryTemplate(query);
    expect(result).toBe('');
  });

  it('should remove FROM command and return formatted template when query has pipes', () => {
    const query = 'FROM logs | WHERE status = "error"';
    const result = prettifyQueryTemplate(query);
    expect(result).toBe('\n| WHERE status = "error"');
  });
});

describe('prettifyQuery', () => {
  it('should format single command without pipe', () => {
    const query = 'FROM logs';
    const result = prettifyQuery(query);
    expect(result).toBe('FROM logs');
  });

  it('should format multiple commands with proper indentation', () => {
    const query = 'FROM logs | WHERE status = "error" | STATS count = COUNT(*)';
    const result = prettifyQuery(query);
    expect(result).toBe('FROM logs\n  | WHERE status = "error"\n  | STATS count = COUNT(*)');
  });
});
