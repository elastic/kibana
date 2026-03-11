/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { collapseChainedDiffs, computeMinimalChange } from './attachment_bridge';

describe('collapseChainedDiffs', () => {
  it('collapses two chained diffs into a single net change', () => {
    const original = 'line1\nline2\n';
    const intermediate = 'line1\nchanged\n';
    const final = 'line1\nfinal\n';

    const diffs = [
      {
        beforeYaml: original,
        afterYaml: intermediate,
        proposalId: 'p1',
        status: 'pending' as const,
      },
      { beforeYaml: intermediate, afterYaml: final, proposalId: 'p2', status: 'pending' as const },
    ];

    const result = collapseChainedDiffs(diffs);
    expect(result).toHaveLength(1);
    expect(result[0].beforeYaml).toBe(original);
    expect(result[0].afterYaml).toBe(final);
    expect(result[0].proposalId).toBe('p2');
  });

  it('returns unchanged diffs when no chain exists', () => {
    const diffs = [
      { beforeYaml: 'a', afterYaml: 'b', proposalId: 'p1', status: 'pending' as const },
      { beforeYaml: 'c', afterYaml: 'd', proposalId: 'p2', status: 'pending' as const },
    ];

    const result = collapseChainedDiffs(diffs);
    expect(result).toHaveLength(2);
  });

  it('collapses a chain of three diffs into one', () => {
    const diffs = [
      { beforeYaml: 'a', afterYaml: 'b', proposalId: 'p1', status: 'pending' as const },
      { beforeYaml: 'b', afterYaml: 'c', proposalId: 'p2', status: 'pending' as const },
      { beforeYaml: 'c', afterYaml: 'd', proposalId: 'p3', status: 'pending' as const },
    ];

    const result = collapseChainedDiffs(diffs);
    expect(result).toHaveLength(1);
    expect(result[0].beforeYaml).toBe('a');
    expect(result[0].afterYaml).toBe('d');
    expect(result[0].proposalId).toBe('p3');
  });

  it('handles a single diff with no chaining', () => {
    const diffs = [
      { beforeYaml: 'x', afterYaml: 'y', proposalId: 'p1', status: 'pending' as const },
    ];

    const result = collapseChainedDiffs(diffs);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(diffs[0]);
  });

  it('handles empty array', () => {
    expect(collapseChainedDiffs([])).toEqual([]);
  });

  it('collapses only the chained portion and leaves independent diffs alone', () => {
    const diffs = [
      { beforeYaml: 'a', afterYaml: 'b', proposalId: 'p1', status: 'pending' as const },
      { beforeYaml: 'b', afterYaml: 'c', proposalId: 'p2', status: 'pending' as const },
      { beforeYaml: 'x', afterYaml: 'y', proposalId: 'p3', status: 'pending' as const },
    ];

    const result = collapseChainedDiffs(diffs);
    expect(result).toHaveLength(2);
    expect(result[0].beforeYaml).toBe('a');
    expect(result[0].afterYaml).toBe('c');
    expect(result[0].proposalId).toBe('p2');
    expect(result[1]).toEqual(diffs[2]);
  });
});

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
