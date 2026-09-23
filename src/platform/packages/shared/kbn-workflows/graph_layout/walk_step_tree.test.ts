/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Step } from './types';
import { STEP_CHILD_CONTAINER_KEYS, visitStepChildSlots, walkStepTree } from './walk_step_tree';

describe('visitStepChildSlots', () => {
  it('emits steps slot for if step', () => {
    const step = {
      name: 'gate',
      type: 'if',
      steps: [{ name: 'child', type: 'http' }],
    } as unknown as Step;
    const slots: string[] = [];
    visitStepChildSlots(step, (slot) => slots.push(slot.kind));
    expect(slots).toContain('steps');
  });

  it('emits else slot for if step with else', () => {
    const step = {
      name: 'gate',
      type: 'if',
      steps: [{ name: 'a', type: 'http' }],
      else: [{ name: 'b', type: 'http' }],
    } as unknown as Step;
    const slots: string[] = [];
    visitStepChildSlots(step, (slot) => slots.push(slot.kind));
    expect(slots).toContain('steps');
    expect(slots).toContain('else');
  });

  it('emits one branch slot per branch with correct index and name', () => {
    const step = {
      name: 'par',
      type: 'parallel',
      branches: [
        { name: 'left', steps: [{ name: 'a', type: 'http' }] },
        { name: 'right', steps: [{ name: 'b', type: 'http' }] },
      ],
    } as unknown as Step;
    const collected: Array<{ kind: string; index?: number; name?: string }> = [];
    visitStepChildSlots(step, (slot) => collected.push(slot));
    const branches = collected.filter((s) => s.kind === 'branch');
    expect(branches).toHaveLength(2);
    expect(branches[0]).toMatchObject({ kind: 'branch', index: 0, name: 'left' });
    expect(branches[1]).toMatchObject({ kind: 'branch', index: 1, name: 'right' });
  });

  it('emits one case slot per case with correct index and match', () => {
    const step = {
      name: 'router',
      type: 'switch',
      cases: [
        { match: 'a', steps: [{ name: 'on-a', type: 'http' }] },
        { match: 'b', steps: [{ name: 'on-b', type: 'http' }] },
        { match: 'c', steps: [{ name: 'on-c', type: 'http' }] },
      ],
    } as unknown as Step;
    const collected: Array<{ kind: string; index?: number; match?: unknown }> = [];
    visitStepChildSlots(step, (slot) => collected.push(slot));
    const cases = collected.filter((s) => s.kind === 'case');
    expect(cases).toHaveLength(3);
    expect(cases[0]).toMatchObject({ kind: 'case', index: 0, match: 'a' });
    expect(cases[1]).toMatchObject({ kind: 'case', index: 1, match: 'b' });
    expect(cases[2]).toMatchObject({ kind: 'case', index: 2, match: 'c' });
  });

  it('emits fallback slot for on-failure.fallback', () => {
    const step = {
      name: 'act',
      type: 'http',
      'on-failure': { fallback: [{ name: 'handler', type: 'http' }] },
    } as unknown as Step;
    const slots: string[] = [];
    visitStepChildSlots(step, (slot) => slots.push(slot.kind));
    expect(slots).toContain('fallback');
  });

  it('emits iteration-fallback slot for iteration-on-failure.fallback', () => {
    const step = {
      name: 'loop',
      type: 'foreach',
      foreach: '{{ items }}',
      steps: [{ name: 'item', type: 'http' }],
      'iteration-on-failure': { fallback: [{ name: 'error', type: 'console' }] },
    } as unknown as Step;
    const slots: string[] = [];
    visitStepChildSlots(step, (slot) => slots.push(slot.kind));
    expect(slots).toContain('steps');
    expect(slots).toContain('iteration-fallback');
    // The loop body (steps) must come before iteration-fallback in slot order
    expect(slots.indexOf('steps')).toBeLessThan(slots.indexOf('iteration-fallback'));
  });
});

describe('STEP_CHILD_CONTAINER_KEYS — object-model ↔ AST invariant', () => {
  /**
   * This test guards against the two enumerations (visitStepChildSlots in
   * walk_step_tree.ts and the key set used by getStepNode in the YAML-AST
   * walker) diverging. A fixture that exercises every slot is walked by
   * walkStepTree; the names found must match those found by a key-set walk
   * over STEP_CHILD_CONTAINER_KEYS in get_step_node.ts.
   *
   * Here we test the key-set side directly: STEP_CHILD_CONTAINER_KEYS must
   * contain every top-level YAML key that visitStepChildSlots descends into.
   */
  it('STEP_CHILD_CONTAINER_KEYS covers every slot emitted by visitStepChildSlots', () => {
    const keySet = new Set(STEP_CHILD_CONTAINER_KEYS);

    // Every kind of slot that visitStepChildSlots can produce maps to at least
    // one key in STEP_CHILD_CONTAINER_KEYS.
    const slotToKeys = {
      steps: ['steps'],
      else: ['else'],
      branch: ['branches'],
      case: ['cases'],
      default: ['default'],
      fallback: ['on-failure', 'fallback'],
      'iteration-fallback': ['iteration-on-failure', 'fallback'],
    } as const;

    for (const [slotKind, requiredKeys] of Object.entries(slotToKeys)) {
      for (const key of requiredKeys) {
        expect(keySet.has(key)).toBe(true);
        if (!keySet.has(key)) {
          throw new Error(
            `Slot '${slotKind}' requires key '${key}' in STEP_CHILD_CONTAINER_KEYS. ` +
              `The object-model and AST walkers are out of sync.`
          );
        }
      }
    }
  });

  it('walkStepTree reaches every step that visitStepChildSlots would visit', () => {
    // A fixture with every slot kind.
    const workflow: ReadonlyArray<Step> = [
      {
        name: 'gate',
        type: 'if',
        steps: [{ name: 'then-step', type: 'http' } as Step],
        else: [{ name: 'else-step', type: 'http' } as Step],
        'on-failure': { fallback: [{ name: 'gate-handler', type: 'console' } as Step] },
      } as unknown as Step,
      {
        name: 'par',
        type: 'parallel',
        branches: [
          { name: 'b0', steps: [{ name: 'b0-step', type: 'http' } as Step] },
          { name: 'b1', steps: [{ name: 'b1-step', type: 'http' } as Step] },
        ],
      } as unknown as Step,
      {
        name: 'router',
        type: 'switch',
        cases: [
          { match: 'x', steps: [{ name: 'case-x', type: 'http' } as Step] },
          { match: 'y', steps: [{ name: 'case-y', type: 'http' } as Step] },
        ],
        default: [{ name: 'default-step', type: 'http' } as Step],
      } as unknown as Step,
      {
        name: 'loop',
        type: 'foreach',
        foreach: '{{ items }}',
        steps: [{ name: 'loop-body', type: 'http' } as Step],
        'iteration-on-failure': {
          fallback: [{ name: 'loop-error', type: 'console' } as Step],
        },
      } as unknown as Step,
    ];

    const visited: string[] = [];
    walkStepTree(workflow, (step) => visited.push(step.name));

    const expected = [
      'gate',
      'then-step',
      'else-step',
      'gate-handler',
      'par',
      'b0-step',
      'b1-step',
      'router',
      'case-x',
      'case-y',
      'default-step',
      'loop',
      'loop-body',
      'loop-error',
    ];
    for (const name of expected) {
      expect(visited).toContain(name);
    }
  });
});
