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
import { buildStepSeverityMap, getStepSeverity } from './step_severity';
import type {
  YamlValidationErrorSeverity,
  YamlValidationResult,
} from '../../../../features/validate_workflow_yaml/model/types';

// ── Factories ────────────────────────────────────────────────────────────────

const makeStep = (lineStart: number, lineEnd: number, stepId = 'step'): StepInfo => ({
  stepId,
  stepType: 'wait',
  stepYamlNode: new YAML.YAMLMap(),
  propInfos: {},
  lineStart,
  lineEnd,
});

/**
 * Creates a complete YamlValidationResult (owner: 'yaml') without an `as` cast.
 * `YamlValidationResultMonacoYaml` is not exported, so we use `Extract` to get the
 * correct union member and `satisfies` to verify all required fields are present.
 */
const makeError = (
  startLineNumber: number,
  severity: YamlValidationErrorSeverity
): Extract<YamlValidationResult, { owner: 'yaml' }> =>
  ({
    id: `err-${startLineNumber}`,
    owner: 'yaml',
    ruleId: 'yamlSyntaxError',
    severity,
    startLineNumber,
    startColumn: 1,
    endLineNumber: startLineNumber,
    endColumn: 80,
    message: 'test error',
    hoverMessage: null,
  } satisfies Extract<YamlValidationResult, { owner: 'yaml' }>);

// ── getStepSeverity ───────────────────────────────────────────────────────────

describe('getStepSeverity', () => {
  it('returns null when no errors fall in the step range', () => {
    expect(getStepSeverity(makeStep(1, 5), [makeError(10, 'error')])).toBeNull();
  });

  it('returns "error" when an error falls in range', () => {
    expect(getStepSeverity(makeStep(1, 5), [makeError(3, 'error')])).toBe('error');
  });

  it('returns "warning" when only a warning falls in range', () => {
    expect(getStepSeverity(makeStep(1, 5), [makeError(3, 'warning')])).toBe('warning');
  });

  it('prefers "error" over "warning" when both are in range', () => {
    const errors = [makeError(2, 'warning'), makeError(4, 'error')];
    expect(getStepSeverity(makeStep(1, 5), errors)).toBe('error');
  });
});

// ── buildStepSeverityMap ─────────────────────────────────────────────────────

describe('buildStepSeverityMap', () => {
  it('maps each step id to its severity', () => {
    const entries: Array<[string, StepInfo]> = [
      ['a', makeStep(1, 2, 'a')],
      ['b', makeStep(3, 4, 'b')],
    ];
    const effectiveLineEnd = new Map([
      ['a', 2],
      ['b', 4],
    ]);
    const errors = [makeError(1, 'error'), makeError(3, 'warning')];
    const map = buildStepSeverityMap(entries, errors, effectiveLineEnd);
    expect(map.get('a')?.severity).toBe('error');
    expect(map.get('b')?.severity).toBe('warning');
  });

  it('marks isOwn=true when an error falls in the effective (trimmed) range', () => {
    // child spans 5–10, effectiveLineEnd=7 (trimmed because it has nested children).
    // Error at line 6 is in [5, 7] → own.
    const entries: Array<[string, StepInfo]> = [['parent', makeStep(5, 10, 'parent')]];
    const effectiveLineEnd = new Map([['parent', 7]]);
    const errors = [makeError(6, 'error')];
    const map = buildStepSeverityMap(entries, errors, effectiveLineEnd);
    expect(map.get('parent')?.isOwn).toBe(true);
    expect(map.get('parent')?.severity).toBe('error');
  });

  it('marks isOwn=false (inherited) when an error falls beyond effectiveLineEnd but within lineEnd', () => {
    // parent spans 1–10, effectiveLineEnd=3 (trimmed). Error at line 7 is beyond 3 → inherited.
    const entries: Array<[string, StepInfo]> = [['parent', makeStep(1, 10, 'parent')]];
    const effectiveLineEnd = new Map([['parent', 3]]);
    const errors = [makeError(7, 'error')];
    const map = buildStepSeverityMap(entries, errors, effectiveLineEnd);
    const info = map.get('parent');
    expect(info?.severity).toBe('error'); // roll-up: still shows severity
    expect(info?.isOwn).toBe(false); // but it is inherited from a descendant
  });

  it('roll-up: a child error makes every ancestor show severity (isOwn=false)', () => {
    // grandparent(1-20) → parent(5-15) → child(8-12)
    // Error at line 9 (inside child's own range) should appear on all three.
    const grandparent = makeStep(1, 20, 'grandparent');
    const parent = makeStep(5, 15, 'parent');
    const child = makeStep(8, 12, 'child');
    const entries: Array<[string, StepInfo]> = [
      ['grandparent', grandparent],
      ['parent', parent],
      ['child', child],
    ];
    // effectiveLineEnd trims each step to just before its first direct child.
    const effectiveLineEnd = new Map([
      ['grandparent', 4], // grandparent's own content ends at line 4
      ['parent', 7], // parent's own content ends at line 7
      ['child', 12], // child has no sub-children, so full range
    ]);
    const errors = [makeError(9, 'error')];
    const map = buildStepSeverityMap(entries, errors, effectiveLineEnd);

    // The child sees line 9 in [8, 12] → own error.
    expect(map.get('child')?.severity).toBe('error');
    expect(map.get('child')?.isOwn).toBe(true);

    // The parent sees line 9 in [5, 15] but beyond effectiveLineEnd=7 → inherited.
    expect(map.get('parent')?.severity).toBe('error');
    expect(map.get('parent')?.isOwn).toBe(false);

    // The grandparent sees line 9 in [1, 20] but beyond effectiveLineEnd=4 → inherited.
    expect(map.get('grandparent')?.severity).toBe('error');
    expect(map.get('grandparent')?.isOwn).toBe(false);
  });

  it('roll-up is pinned: ancestor severity cannot be silently removed', () => {
    // This test exists to prevent well-intentioned "fixes" that would strip the roll-up.
    // See the buildStepSeverityMap doc comment for the rationale.
    const parent = makeStep(1, 10, 'parent');
    const child = makeStep(5, 10, 'child');
    const entries: Array<[string, StepInfo]> = [
      ['parent', parent],
      ['child', child],
    ];
    const effectiveLineEnd = new Map([
      ['parent', 4], // trimmed; child starts at 5
      ['child', 10],
    ]);
    const errors = [makeError(7, 'warning')]; // error only on child's line
    const map = buildStepSeverityMap(entries, errors, effectiveLineEnd);

    // The parent must still show severity even though the error is in the child — roll-up.
    expect(map.get('parent')?.severity).not.toBeNull();
    // The visual distinction between own/inherited is SR-only; the severity itself is the same.
    expect(map.get('child')?.severity).toBe(map.get('parent')?.severity);
  });
});
