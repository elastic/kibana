/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowYaml } from '@kbn/workflows';
import { collectStepNames } from './collect_step_names';

const stepsOf = (steps: unknown[]): WorkflowYaml['steps'] =>
  steps as unknown as WorkflowYaml['steps'];

const leaf = (name: string) => ({ name, type: 'console', with: { message: 'x' } });

describe('collectStepNames', () => {
  it('is empty without steps', () => {
    expect(collectStepNames(undefined).size).toBe(0);
    expect(collectStepNames(stepsOf([])).size).toBe(0);
  });

  it('collects top-level steps', () => {
    expect([...collectStepNames(stepsOf([leaf('a'), leaf('b')]))]).toEqual(['a', 'b']);
  });

  it.each([
    ['steps', { steps: [leaf('inner')] }],
    ['else', { else: [leaf('inner')] }],
    ['cases', { cases: [{ match: 'x', steps: [leaf('inner')] }] }],
    ['default', { default: [leaf('inner')] }],
    ['branches', { branches: [{ name: 'b', steps: [leaf('inner')] }] }],
    ['on-failure fallback', { 'on-failure': { fallback: [leaf('inner')] } }],
    ['iteration-on-failure fallback', { 'iteration-on-failure': { fallback: [leaf('inner')] } }],
  ])('collects a step nested under %s', (_label, container) => {
    const names = collectStepNames(stepsOf([{ name: 'owner', type: 'if', ...container }]));
    expect(names.has('owner')).toBe(true);
    expect(names.has('inner')).toBe(true);
  });

  it('collects steps nested several levels deep', () => {
    const names = collectStepNames(
      stepsOf([
        {
          name: 'outer',
          type: 'foreach',
          steps: [{ name: 'middle', type: 'if', else: [leaf('deep')] }],
        },
      ])
    );
    expect([...names].sort()).toEqual(['deep', 'middle', 'outer']);
  });

  it('trims names and skips blank ones', () => {
    const names = collectStepNames(stepsOf([leaf('  padded  '), leaf('   '), leaf('')]));
    expect([...names]).toEqual(['padded']);
  });

  it('does not read data that merely looks like a step', () => {
    const names = collectStepNames(
      stepsOf([{ name: 'owner', type: 'console', with: { name: 'decoy', type: 'console' } }])
    );
    expect(names.has('decoy')).toBe(false);
  });
});
