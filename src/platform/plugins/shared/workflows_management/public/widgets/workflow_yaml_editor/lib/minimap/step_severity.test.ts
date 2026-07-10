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
import type { YamlValidationResult } from '../../../../features/validate_workflow_yaml/model/types';

const makeStep = (lineStart: number, lineEnd: number, stepId = 'step'): StepInfo => ({
  stepId,
  stepType: 'wait',
  stepYamlNode: new YAML.YAMLMap(),
  propInfos: {},
  lineStart,
  lineEnd,
});

const makeError = (
  startLineNumber: number,
  severity: YamlValidationResult['severity']
): YamlValidationResult =>
  ({
    owner: 'yaml',
    severity,
    startLineNumber,
    startColumn: 1,
    endLineNumber: startLineNumber,
    endColumn: 1,
    message: 'test',
  } as YamlValidationResult);

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

  it('ignores errors with a null severity', () => {
    expect(getStepSeverity(makeStep(1, 5), [makeError(3, null)])).toBeNull();
  });
});

describe('buildStepSeverityMap', () => {
  it('maps each step id to its severity in one pass', () => {
    const entries: Array<[string, StepInfo]> = [
      ['a', makeStep(1, 2, 'a')],
      ['b', makeStep(3, 4, 'b')],
    ];
    const errors = [makeError(1, 'error'), makeError(3, 'warning')];
    const map = buildStepSeverityMap(entries, errors);
    expect(map.get('a')).toBe('error');
    expect(map.get('b')).toBe('warning');
  });
});
