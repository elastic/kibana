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
  withNullifyUnmappedFields,
} from './esql_nullify_unmapped_fields';

describe('withNullifyUnmappedFields', () => {
  it('prepends the NULLIFY SET header separated by a space', () => {
    expect(withNullifyUnmappedFields('FROM logs-*')).toBe(
      `${ESQL_NULLIFY_UNMAPPED_FIELDS} FROM logs-*`
    );
  });

  it('collapses a multi-line composer query into a single line', () => {
    const multiline = from('logs-*')
      .pipe(where('error.culprit == ?culprit', { culprit: 'Main.Cache.func3' }))
      .toString();

    // Sanity check: the composer emits a multi-line query.
    expect(multiline).toContain('\n');

    const result = withNullifyUnmappedFields(multiline);

    expect(result).toBe(
      `${ESQL_NULLIFY_UNMAPPED_FIELDS} FROM logs-* | WHERE error.culprit == "Main.Cache.func3"`
    );
    expect(result).not.toContain('\n');
  });

  it('is idempotent — does not double-prepend the SET directive', () => {
    const once = withNullifyUnmappedFields('FROM logs-*');
    expect(withNullifyUnmappedFields(once)).toBe(once);
  });

  it('single-line guarantee holds for a complex multi-command query', () => {
    const multiline = from('logs-*')
      .pipe(
        where('error.culprit == ?culprit', { culprit: 'Main.Cache.func3' }),
        where('service.name == ?service', { service: 'my-svc' })
      )
      .toString();

    expect(multiline).toContain('\n');

    const result = withNullifyUnmappedFields(multiline);

    // Regression: single-line output must survive even with multiple piped commands.
    expect(result).not.toContain('\n');
    expect(result.startsWith(ESQL_NULLIFY_UNMAPPED_FIELDS)).toBe(true);
  });
});
