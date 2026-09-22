/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from, where } from '@kbn/esql-composer';
import { withUnmappedFields } from './esql_unmapped_fields';

const NULLIFY_HEADER = 'SET unmapped_fields="NULLIFY";';

describe('withUnmappedFields', () => {
  it('prepends NULLIFY with a newline by default', () => {
    expect(withUnmappedFields('FROM logs-*')).toBe(`${NULLIFY_HEADER}\nFROM logs-*`);
  });

  it('prepends the LOAD SET header with newline when policy is LOAD', () => {
    expect(withUnmappedFields('FROM logs-*', { policy: 'LOAD' })).toBe(
      'SET unmapped_fields="LOAD";\nFROM logs-*'
    );
  });

  it('preserves the composer query verbatim, including its line breaks', () => {
    const composerOutput = from('logs-*')
      .pipe(where('error.culprit == ?culprit', { culprit: 'Main.Cache.func3' }))
      .toString();

    expect(composerOutput).toContain('\n');
    expect(withUnmappedFields(composerOutput)).toBe(`${NULLIFY_HEADER}\n${composerOutput}`);
  });

  it('is idempotent — does not double-prepend the SET directive', () => {
    const once = withUnmappedFields('FROM logs-*');
    expect(withUnmappedFields(once)).toBe(once);
  });
});
