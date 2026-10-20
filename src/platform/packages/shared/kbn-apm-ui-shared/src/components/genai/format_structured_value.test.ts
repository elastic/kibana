/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatStructuredValue } from './format_structured_value';

describe('formatStructuredValue', () => {
  it('formats objects as key: value rows with nested indentation', () => {
    expect(formatStructuredValue({ took: 14, partial: false, meta: { name: 'x', tags: [] } })).toBe(
      ['took: 14', 'partial: false', 'meta:', '  name: x', '  tags: []'].join('\n')
    );
  });

  it('formats arrays with dashes, starting nested collections on the dash line', () => {
    expect(
      formatStructuredValue({
        results: [{ type: 'other', data: { ok: true } }],
        values: [[1423, 'refused']],
      })
    ).toBe(
      [
        'results:',
        '  - type: other',
        '    data:',
        '      ok: true',
        'values:',
        '  - - 1423',
        '    - refused',
      ].join('\n')
    );
  });

  it('keeps line breaks of multi-line strings in literal blocks', () => {
    expect(formatStructuredValue({ text: 'line 1\nline 2', empty: '', none: null })).toBe(
      ['text: |-', '  line 1', '  line 2', 'empty: ""', 'none: null'].join('\n')
    );
  });

  it('quotes strings that YAML would otherwise misread', () => {
    expect(
      formatStructuredValue({
        message: 'connection refused: payments:8080',
        flag: 'true',
        version: '9.6',
        path: '/workspace/README.md',
        url: 'https://example.com/a#b',
      })
    ).toBe(
      [
        'message: "connection refused: payments:8080"',
        'flag: "true"',
        'version: "9.6"',
        'path: /workspace/README.md',
        'url: https://example.com/a#b',
      ].join('\n')
    );
  });

  it('renders every item of long arrays', () => {
    const items = Array.from({ length: 1000 }, (_, i) => i);
    const lines = formatStructuredValue(items).split('\n');
    expect(lines).toHaveLength(1000);
    expect(lines[lines.length - 1]).toBe('- 999');
  });
});
