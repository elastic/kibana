/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeMinimalChange } from './attachment_bridge';

describe('computeMinimalChange', () => {
  it('returns null when before and after are identical', () => {
    const yaml = 'name: test\nsteps:\n  - name: s1\n    type: console\n';
    expect(computeMinimalChange(yaml, yaml, 'p1')).toBeNull();
  });

  it('detects a simple insert in the middle', () => {
    const before = 'line1\nline2\nline3\n';
    const after = 'line1\nline2\nnewline\nline3\n';

    const result = computeMinimalChange(before, after, 'p1');
    expect(result).toEqual({
      proposalId: 'p1',
      type: 'insert',
      startLine: 3,
      newText: 'newline\n',
    });
  });

  it('detects a replace', () => {
    const before = 'line1\nline2\nline3\n';
    const after = 'line1\nchanged\nline3\n';

    const result = computeMinimalChange(before, after, 'p1');
    expect(result).toEqual({
      proposalId: 'p1',
      type: 'replace',
      startLine: 2,
      endLine: 2,
      newText: 'changed\n',
    });
  });

  it('detects a delete', () => {
    const before = 'line1\nline2\nline3\n';
    const after = 'line1\nline3\n';

    const result = computeMinimalChange(before, after, 'p1');
    expect(result).toEqual({
      proposalId: 'p1',
      type: 'delete',
      startLine: 2,
      endLine: 2,
      newText: '',
    });
  });

  it('handles insert at end when before has trailing newline', () => {
    const before = 'name: test\nsteps:\n  - name: s1\n    type: console\n';
    const after =
      'name: test\nsteps:\n  - name: s1\n    type: console\n  - name: s2\n    type: console\n';

    const result = computeMinimalChange(before, after, 'p1');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('insert');
    expect(result!.newText).toContain('- name: s2');
  });

  it('handles insert at end when before has NO trailing newline', () => {
    const before = 'name: test\nsteps:\n  - name: s1\n    type: console';
    const after =
      'name: test\nsteps:\n  - name: s1\n    type: console\n  - name: s2\n    type: console\n';

    const result = computeMinimalChange(before, after, 'p1');
    expect(result).not.toBeNull();
    expect(result!.type).toBe('replace');
    expect(result!.startLine).toBe(4);
    expect(result!.newText).toContain('    type: console\n');
    expect(result!.newText).toContain('  - name: s2\n');
    expect(result!.newText.startsWith('    type: console\n')).toBe(true);
  });

  it('handles insert after ESQL step without trailing newline', () => {
    const before = [
      'name: test_coalesce_safe',
      'enabled: true',
      '',
      'triggers:',
      '  - type: manual',
      '',
      'steps:',
      '  - name: test_values',
      '    type: console',
      '    with:',
      '      message: "3"',
      '',
      '  - name: esql_coalesce_test',
      '    type: elasticsearch.esql.query',
      '    with:',
      '      format: json',
      '      query: |',
      '        FROM test_properties',
      '        | EVAL bedrooms_checked = COALESCE(?, 0)',
      '        | KEEP bedrooms_checked',
      '      params:',
      '        - "{{ steps.test_values.output.message }}"',
    ].join('\n');

    const after = `${before}\n  - name: print_hello_world\n    type: console\n    with:\n      message: hello world\n`;

    const result = computeMinimalChange(before, after, 'p1');
    expect(result).not.toBeNull();

    expect(result!.startLine).toBeLessThanOrEqual(before.split('\n').length);

    expect(result!.newText).toContain('  - name: print_hello_world');
    expect(result!.newText).toContain('    type: console');

    const lastBeforeLine = '        - "{{ steps.test_values.output.message }}"';
    if (result!.type === 'replace') {
      expect(result!.newText.startsWith(lastBeforeLine)).toBe(true);
      expect(result!.newText).toContain(`${lastBeforeLine}\n`);
    }
  });
});
