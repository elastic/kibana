/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { from, where } from '@kbn/esql-composer';
import {
  ESQL_NULLIFY_UNMAPPED_FIELDS,
  withUnmappedFields,
} from './esql_unmapped_fields';

describe('withUnmappedFields', () => {
  it('prepends NULLIFY with newline by default (multiline: true)', () => {
    expect(withUnmappedFields('FROM logs-*')).toBe(`${ESQL_NULLIFY_UNMAPPED_FIELDS}\nFROM logs-*`);
  });

  it('prepends the LOAD SET header with newline when policy is LOAD', () => {
    expect(withUnmappedFields('FROM logs-*', { policy: 'LOAD' })).toBe(
      'SET unmapped_fields="LOAD";\nFROM logs-*'
    );
  });

  it('preserves composer multiline format by default (no Parser round-trip)', () => {
    const composerOutput = from('logs-*')
      .pipe(where('error.culprit == ?culprit', { culprit: 'Main.Cache.func3' }))
      .toString();

    expect(composerOutput).toContain('\n');
    expect(withUnmappedFields(composerOutput)).toBe(`${ESQL_NULLIFY_UNMAPPED_FIELDS}\n${composerOutput}`);
  });

  it('collapses a multi-line composer query into a single line when multiline: false', () => {
    const composerOutput = from('logs-*')
      .pipe(where('error.culprit == ?culprit', { culprit: 'Main.Cache.func3' }))
      .toString();

    expect(composerOutput).toContain('\n');

    const result = withUnmappedFields(composerOutput, { multiline: false });

    expect(result).toBe(
      `${ESQL_NULLIFY_UNMAPPED_FIELDS} FROM logs-* | WHERE error.culprit == "Main.Cache.func3"`
    );
    expect(result).not.toContain('\n');
  });

  it('is idempotent — does not double-prepend the SET directive', () => {
    const once = withUnmappedFields('FROM logs-*');
    expect(withUnmappedFields(once)).toBe(once);
  });

  it('single-line guarantee holds for a complex multi-command query when multiline: false', () => {
    const multiline = from('logs-*')
      .pipe(
        where('error.culprit == ?culprit', { culprit: 'Main.Cache.func3' }),
        where('service.name == ?service', { service: 'my-svc' })
      )
      .toString();

    expect(multiline).toContain('\n');

    const result = withUnmappedFields(multiline, { multiline: false });

    expect(result).not.toContain('\n');
    expect(result.startsWith(ESQL_NULLIFY_UNMAPPED_FIELDS)).toBe(true);
  });
});
