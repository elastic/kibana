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
import { computeStepStructureFingerprint } from './step_structure_fingerprint';

const makeStep = (
  overrides: Partial<StepInfo> & { lineStart: number; lineEnd: number }
): StepInfo => ({
  stepId: 'step',
  stepType: 'wait',
  stepYamlNode: new YAML.YAMLMap(),
  propInfos: {},
  ...overrides,
});

describe('computeStepStructureFingerprint', () => {
  it('is stable across a new array/object with identical structural content', () => {
    const entriesA: Array<[string, StepInfo]> = [
      ['a', makeStep({ stepId: 'a', lineStart: 1, lineEnd: 2 })],
    ];
    const entriesB: Array<[string, StepInfo]> = [
      ['a', makeStep({ stepId: 'a', lineStart: 1, lineEnd: 2, stepType: 'http' })],
    ];
    // stepType differs but isn't part of the fingerprint — it's irrelevant to minimap layout.
    expect(computeStepStructureFingerprint(entriesA)).toBe(
      computeStepStructureFingerprint(entriesB)
    );
  });

  it('changes when a step is added', () => {
    const before: Array<[string, StepInfo]> = [
      ['a', makeStep({ stepId: 'a', lineStart: 1, lineEnd: 2 })],
    ];
    const after: Array<[string, StepInfo]> = [
      ...before,
      ['b', makeStep({ stepId: 'b', lineStart: 3, lineEnd: 4 })],
    ];
    expect(computeStepStructureFingerprint(before)).not.toBe(
      computeStepStructureFingerprint(after)
    );
  });

  it('changes when a step moves lines', () => {
    const before: Array<[string, StepInfo]> = [
      ['a', makeStep({ stepId: 'a', lineStart: 1, lineEnd: 2 })],
    ];
    const after: Array<[string, StepInfo]> = [
      ['a', makeStep({ stepId: 'a', lineStart: 5, lineEnd: 6 })],
    ];
    expect(computeStepStructureFingerprint(before)).not.toBe(
      computeStepStructureFingerprint(after)
    );
  });

  it('changes when nesting (parentStepId/branchKey) changes', () => {
    const before: Array<[string, StepInfo]> = [
      ['a', makeStep({ stepId: 'a', lineStart: 1, lineEnd: 2 })],
    ];
    const after: Array<[string, StepInfo]> = [
      [
        'a',
        makeStep({
          stepId: 'a',
          lineStart: 1,
          lineEnd: 2,
          parentStepId: 'parent',
          branchKey: 'else',
        }),
      ],
    ];
    expect(computeStepStructureFingerprint(before)).not.toBe(
      computeStepStructureFingerprint(after)
    );
  });

  it('returns an empty string for no steps', () => {
    expect(computeStepStructureFingerprint([])).toBe('');
  });
});
