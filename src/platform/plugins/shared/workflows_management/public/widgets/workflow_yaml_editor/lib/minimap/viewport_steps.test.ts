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
import { buildEffectiveLineEnd, computeViewportSteps } from './viewport_steps';

const makeStep = (
  overrides: Partial<StepInfo> & { lineStart: number; lineEnd: number }
): StepInfo => ({
  stepId: 'step',
  stepType: 'wait',
  stepYamlNode: new YAML.YAMLMap(),
  propInfos: {},
  ...overrides,
});

describe('buildEffectiveLineEnd', () => {
  it('trims a parent step end to just before its first child', () => {
    const entries: Array<[string, StepInfo]> = [
      ['parent', makeStep({ stepId: 'parent', lineStart: 1, lineEnd: 10 })],
      ['child', makeStep({ stepId: 'child', lineStart: 3, lineEnd: 5, parentStepId: 'parent' })],
    ];
    const effectiveLineEnd = buildEffectiveLineEnd(entries);
    expect(effectiveLineEnd.get('parent')).toBe(2); // 3 - 1
    expect(effectiveLineEnd.get('child')).toBe(5);
  });

  it('leaves a leaf step untrimmed', () => {
    const entries: Array<[string, StepInfo]> = [
      ['solo', makeStep({ stepId: 'solo', lineStart: 1, lineEnd: 4 })],
    ];
    expect(buildEffectiveLineEnd(entries).get('solo')).toBe(4);
  });
});

describe('computeViewportSteps', () => {
  const entries: Array<[string, StepInfo]> = [
    ['a', makeStep({ stepId: 'a', lineStart: 1, lineEnd: 2 })],
    ['b', makeStep({ stepId: 'b', lineStart: 3, lineEnd: 4 })],
    ['c', makeStep({ stepId: 'c', lineStart: 5, lineEnd: 6 })],
  ];
  const effectiveLineEnd = buildEffectiveLineEnd(entries);

  it('returns null when there is no visible range or no steps', () => {
    expect(computeViewportSteps(entries, effectiveLineEnd, null)).toBeNull();
    expect(computeViewportSteps([], effectiveLineEnd, { start: 1, end: 2 })).toBeNull();
  });

  it('returns the overlapping step range', () => {
    expect(computeViewportSteps(entries, effectiveLineEnd, { start: 3, end: 4 })).toEqual({
      first: 1,
      last: 1,
    });
  });

  it('clamps to the first step when the viewport is above all steps', () => {
    expect(computeViewportSteps(entries, effectiveLineEnd, { start: -5, end: 0 })).toEqual({
      first: 0,
      last: 0,
    });
  });

  it('clamps to the last step when the viewport is below all steps', () => {
    expect(computeViewportSteps(entries, effectiveLineEnd, { start: 100, end: 200 })).toEqual({
      first: 2,
      last: 2,
    });
  });

  it('spans both neighbours when the viewport sits between two steps', () => {
    // Gap between step "a" (ends line 2) and "b" (starts line 3) doesn't actually
    // leave room in this fixture, so widen the gap for this case.
    const spaced: Array<[string, StepInfo]> = [
      ['a', makeStep({ stepId: 'a', lineStart: 1, lineEnd: 2 })],
      ['b', makeStep({ stepId: 'b', lineStart: 10, lineEnd: 11 })],
    ];
    const spacedEffectiveEnd = buildEffectiveLineEnd(spaced);
    expect(computeViewportSteps(spaced, spacedEffectiveEnd, { start: 5, end: 5 })).toEqual({
      first: 0,
      last: 1,
    });
  });
});
