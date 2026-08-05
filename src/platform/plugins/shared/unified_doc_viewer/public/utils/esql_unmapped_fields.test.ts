/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { esql } from '@elastic/esql';
import { withUnmappedFields } from './esql_unmapped_fields';

describe('withUnmappedFields', () => {
  it('adds the NULLIFY directive by default', () => {
    const query = withUnmappedFields(esql.from('logs-*'));

    expect(query.print('pipe-multiline')).toBe('SET unmapped_fields = "NULLIFY"; FROM logs-*');
  });

  it('adds the LOAD directive when the policy is LOAD', () => {
    const query = withUnmappedFields(esql.from('logs-*'), { policy: 'LOAD' });

    expect(query.print('pipe-multiline')).toBe('SET unmapped_fields = "LOAD"; FROM logs-*');
  });

  it('preserves the rest of the query, including its line breaks', () => {
    const query = esql.from('logs-*');
    query.where`${esql.col('error.culprit')} == ${esql.str('Main.Cache.func3')}`;
    const withoutDirective = query.print('pipe-multiline');

    expect(withoutDirective).toContain('\n');
    expect(withUnmappedFields(query).print('pipe-multiline')).toBe(
      `SET unmapped_fields = "NULLIFY"; ${withoutDirective}`
    );
  });

  it('is idempotent — does not emit the directive twice', () => {
    const query = withUnmappedFields(esql.from('logs-*'));
    const once = query.print('pipe-multiline');

    expect(withUnmappedFields(query).print('pipe-multiline')).toBe(once);
  });

  it('replaces the previous policy instead of appending a second directive', () => {
    const query = withUnmappedFields(esql.from('logs-*'), { policy: 'NULLIFY' });

    expect(withUnmappedFields(query, { policy: 'LOAD' }).print('pipe-multiline')).toBe(
      'SET unmapped_fields = "LOAD"; FROM logs-*'
    );
  });
});
