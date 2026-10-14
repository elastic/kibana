/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeWorkflowYamlDiffStats } from './workflow_yaml_diff_stats';

describe('computeWorkflowYamlDiffStats', () => {
  it('returns zeroed stats when inputs are identical', () => {
    const stats = computeWorkflowYamlDiffStats('name: same\n', 'name: same\n');
    expect(stats).toEqual({ parts: [], added: 0, removed: 0, hunkCount: 0 });
  });

  it('counts a single-line replacement as +1/-1 and one hunk', () => {
    const stats = computeWorkflowYamlDiffStats('name: original\n', 'name: current\n');
    expect(stats.added).toBe(1);
    expect(stats.removed).toBe(1);
    expect(stats.hunkCount).toBe(1);
    expect(stats.parts.length).toBeGreaterThan(0);
  });

  it('counts separated edits as separate hunks', () => {
    const before = ['name: original', 'enabled: true', 'description: old', 'steps: []'].join('\n');
    const after = ['name: updated', 'enabled: true', 'description: new', 'steps: []'].join('\n');
    const stats = computeWorkflowYamlDiffStats(`${before}\n`, `${after}\n`);
    expect(stats.hunkCount).toBe(2);
    expect(stats.added).toBe(2);
    expect(stats.removed).toBe(2);
  });

  it('counts pure additions', () => {
    const stats = computeWorkflowYamlDiffStats('a\n', 'a\nb\nc\n');
    expect(stats.added).toBe(2);
    expect(stats.removed).toBe(0);
    expect(stats.hunkCount).toBe(1);
  });

  it('counts pure removals', () => {
    const stats = computeWorkflowYamlDiffStats('a\nb\nc\n', 'a\n');
    expect(stats.added).toBe(0);
    expect(stats.removed).toBe(2);
    expect(stats.hunkCount).toBe(1);
  });
});
