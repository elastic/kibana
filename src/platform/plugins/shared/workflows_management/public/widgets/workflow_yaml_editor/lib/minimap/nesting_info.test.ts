/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import type { StepInfo } from '@kbn/workflows-yaml';
import { buildNestingInfo } from './nesting_info';

const makeStep = (
  overrides: Partial<StepInfo> & { lineStart: number; lineEnd: number }
): StepInfo => ({
  stepId: 'step',
  stepType: 'wait',
  stepYamlNode: new YAML.YAMLMap(),
  propInfos: {},
  ...overrides,
});

describe('buildNestingInfo', () => {
  it('reports no nesting for a flat step list', () => {
    const stepsMap: Record<string, StepInfo> = {
      a: makeStep({ stepId: 'a', lineStart: 1, lineEnd: 2 }),
      b: makeStep({ stepId: 'b', lineStart: 3, lineEnd: 4 }),
    };
    const entries: Array<[string, StepInfo]> = Object.entries(stepsMap);
    const info = buildNestingInfo(entries, stepsMap);
    expect(info.hasNesting).toBe(false);
    expect(info.depths.get('a')).toBe(0);
    expect(info.depths.get('b')).toBe(0);
    expect(info.parentGroups).toEqual([]);
  });

  it('groups a nested branch under its top-level parent', () => {
    const stepsMap: Record<string, StepInfo> = {
      parent: makeStep({ stepId: 'parent', lineStart: 1, lineEnd: 10 }),
      child1: makeStep({
        stepId: 'child1',
        lineStart: 2,
        lineEnd: 3,
        parentStepId: 'parent',
        branchKey: 'steps',
      }),
      child2: makeStep({
        stepId: 'child2',
        lineStart: 4,
        lineEnd: 5,
        parentStepId: 'parent',
        branchKey: 'steps',
      }),
    };
    const entries: Array<[string, StepInfo]> = Object.entries(stepsMap);
    const info = buildNestingInfo(entries, stepsMap);

    expect(info.hasNesting).toBe(true);
    expect(info.depths.get('parent')).toBe(0);
    expect(info.depths.get('child1')).toBe(1);
    expect(info.depths.get('child2')).toBe(1);
    expect(info.parentGroups).toHaveLength(1);
    expect(info.parentGroups[0].branches).toHaveLength(1);
    expect(info.parentGroups[0].branches[0]).toMatchObject({ firstIndex: 1, lastIndex: 2 });
  });

  it('keeps distinct branches (e.g. if/else) as separate rails', () => {
    const stepsMap: Record<string, StepInfo> = {
      parent: makeStep({ stepId: 'parent', lineStart: 1, lineEnd: 10 }),
      ifStep: makeStep({
        stepId: 'ifStep',
        lineStart: 2,
        lineEnd: 3,
        parentStepId: 'parent',
        branchKey: 'steps',
      }),
      elseStep: makeStep({
        stepId: 'elseStep',
        lineStart: 4,
        lineEnd: 5,
        parentStepId: 'parent',
        branchKey: 'else',
      }),
    };
    const entries: Array<[string, StepInfo]> = Object.entries(stepsMap);
    const info = buildNestingInfo(entries, stepsMap);

    expect(info.parentGroups[0].branches).toHaveLength(2);
    const branchIds = info.parentGroups[0].branches.map((b) => b.branchId);
    expect(new Set(branchIds).size).toBe(2);
  });

  it('walks through unregistered container nodes to find the branch root', () => {
    // `container` isn't in stepsMap (e.g. a `parallel` branch entry with no `type`),
    // so the walk should stop there and still group correctly under `parent`.
    const stepsMap: Record<string, StepInfo> = {
      parent: makeStep({ stepId: 'parent', lineStart: 1, lineEnd: 10 }),
      nested: makeStep({
        stepId: 'nested',
        lineStart: 2,
        lineEnd: 3,
        parentStepId: 'container', // not present in stepsMap
        branchKey: 'steps',
      }),
    };
    const entries: Array<[string, StepInfo]> = Object.entries(stepsMap);
    const info = buildNestingInfo(entries, stepsMap);
    expect(info.depths.get('nested')).toBe(1);
  });
});
