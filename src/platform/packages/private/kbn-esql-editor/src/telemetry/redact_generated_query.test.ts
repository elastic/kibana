/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { redactGeneratedQuery } from './redact_generated_query';

describe('redactGeneratedQuery', () => {
  it('replaces string and numeric literals but keeps sources and LIMIT', () => {
    expect(
      redactGeneratedQuery({
        query:
          'FROM logs-* | WHERE user.name == "john smith" AND phone == 5551234567 AND bytes > 1.5 | STATS c = COUNT(*) BY host.name | LIMIT 10',
        generatedLineStart: 1,
        generatedLineEnd: 1,
      })
    ).toBe(
      'FROM logs-* | WHERE user.name == ? AND phone == ? AND bytes > ? | STATS c = COUNT(*) BY host.name | LIMIT 10'
    );
  });

  it('returns only the commands on the generated lines, without comments', () => {
    expect(
      redactGeneratedQuery({
        query:
          'FROM logs-*\n// errors for john smith\n| WHERE level == "error" AND user.name == "john smith"\n| STATS c = COUNT(*) BY host.name\n| LIMIT 10',
        generatedLineStart: 3,
        generatedLineEnd: 3,
      })
    ).toBe('WHERE level == ? AND user.name == ?');
  });

  it('returns undefined when the query does not parse', () => {
    expect(
      redactGeneratedQuery({
        query: 'FROM logs-* | WHERE user.name == "john smith" AND',
        generatedLineStart: 1,
        generatedLineEnd: 1,
      })
    ).toBeUndefined();
  });
});
