/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { evaluate } from './eval';
import { from } from './from';

describe('evaluate', () => {
  const source = from('logs-*');

  it('handles single strings', () => {
    const pipeline = source.pipe(
      evaluate('type = CASE(languages <= 1, "monolingual",languages <= 2, "bilingual","polyglot")')
    );

    expect(pipeline.asString()).toEqual(
      'FROM logs-*\n  | EVAL type = CASE(languages <= 1, "monolingual", languages <= 2, "bilingual", "polyglot")'
    );
  });

  it('handles EVAL with params', () => {
    const pipeline = source.pipe(
      evaluate('latestTs = MAX(??ts)', {
        ts: '@timestamp',
      })
    );
    const queryRequest = pipeline.asRequest();

    expect(queryRequest.query).toEqual('FROM logs-*\n  | EVAL latestTs = MAX(??ts)');
    expect(queryRequest.params).toEqual([
      {
        ts: '@timestamp',
      },
    ]);
    expect(pipeline.asString()).toEqual('FROM logs-*\n  | EVAL latestTs = MAX(@timestamp)');
  });
});
