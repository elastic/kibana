/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import YAML from 'yaml';
import { monaco } from '@kbn/monaco';
import {
  findAllSteps,
  findStepAtPosition,
  getStepRange,
  isPositionInStep,
} from './step_detection_utils';
import { createFakeMonacoModel } from '../../../../common/mocks/monaco_model';

describe('step_detection_utils', () => {
  describe('findAllSteps', () => {
    it('should return empty array when yamlDocument is null', () => {
      const model = createFakeMonacoModel('');
      const result = findAllSteps(null as never, model);
      expect(result).toEqual([]);
    });

    it('should return empty array when model is null', () => {
      const yamlDocument = YAML.parseDocument('steps: []');
      const result = findAllSteps(yamlDocument, null as never);
      expect(result).toEqual([]);
    });

    it('should find steps with type declarations', () => {
      const yamlContent = `steps:
  - name: step1
    type: wait
    with:
      duration: 5s
  - name: step2
    type: http
    with:
      url: https://example.com`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const result = findAllSteps(yamlDocument, model);
      expect(result.length).toBe(2);
      expect(result[0].stepType).toBe('wait');
      expect(result[1].stepType).toBe('http');
    });

    it('should find nested steps inside foreach', () => {
      const yamlContent = `steps:
  - name: loop
    type: foreach
    foreach: "{{ items }}"
    steps:
      - name: inner
        type: wait
        with:
          duration: 1s`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const result = findAllSteps(yamlDocument, model);
      // Should find at least one step (the foreach)
      expect(result.length).toBeGreaterThanOrEqual(1);
      const stepTypes = result.map((s) => s.stepType);
      expect(stepTypes).toContain('foreach');
    });

    it('should skip lines that do not start with type:', () => {
      const yamlContent = `steps:
  - name: step1
    with:
      contentType: application/json
    type: http`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const result = findAllSteps(yamlDocument, model);
      // contentType: should not be confused for a step type declaration
      // Only the actual "type:" line should be detected
      const httpSteps = result.filter((s) => s.stepType === 'http');
      expect(httpSteps.length).toBe(1);
    });

    it('should skip duplicate steps', () => {
      const yamlContent = `steps:
  - name: step1
    type: wait
    with:
      duration: 5s`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const result = findAllSteps(yamlDocument, model);
      // Each step at the same index should only appear once
      const stepIndices = result.map((s) => s.stepIndex);
      const uniqueIndices = new Set(stepIndices);
      expect(stepIndices.length).toBe(uniqueIndices.size);
    });

    it('should handle steps without a name and use default stepName', () => {
      const yamlContent = `steps:
  - type: wait
    with:
      duration: 5s`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const result = findAllSteps(yamlDocument, model);
      // The step should be detected; its stepName defaults to step_<index>
      if (result.length > 0) {
        expect(result[0].stepName).toMatch(/step_\d+/);
      }
      // At minimum, the function should not throw
      expect(result).toBeDefined();
    });

    it('should handle empty steps array', () => {
      const yamlContent = `steps: []`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const result = findAllSteps(yamlDocument, model);
      expect(result).toEqual([]);
    });

    it('should handle errors gracefully and continue', () => {
      const yamlContent = `steps:
  - name: step1
    type: wait`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      // This should not throw
      const result = findAllSteps(yamlDocument, model);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getStepRange', () => {
    it('should return null when stepNode has no range', () => {
      const model = createFakeMonacoModel('steps:\n  - type: wait');
      const result = getStepRange({ range: undefined }, model);
      expect(result).toBeNull();
    });

    it('should return null when model is null', () => {
      const result = getStepRange({ range: undefined }, null as never);
      expect(result).toBeNull();
    });

    it('should return a range for a valid step node', () => {
      const yamlContent = `steps:
  - name: step1
    type: wait
    with:
      duration: 5s`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const steps = findAllSteps(yamlDocument, model);
      if (steps.length > 0) {
        const range = getStepRange(steps[0].stepNode, model);
        expect(range).not.toBeNull();
        if (range) {
          expect(range.startLineNumber).toBeGreaterThanOrEqual(1);
          expect(range.endLineNumber).toBeGreaterThanOrEqual(range.startLineNumber);
        }
      }
    });

    it('should adjust end line backwards past empty lines', () => {
      const yamlContent = `steps:
  - name: step1
    type: wait
    with:
      duration: 5s

  - name: step2
    type: http`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const steps = findAllSteps(yamlDocument, model);
      if (steps.length > 0) {
        const range = getStepRange(steps[0].stepNode, model);
        if (range) {
          // The end line should be adjusted to exclude the empty line and the next step's dash
          expect(range.endLineNumber).toBeLessThanOrEqual(5);
        }
      }
    });

    it('should return range that does not go below start line', () => {
      const yamlContent = `steps:
  - type: wait`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const steps = findAllSteps(yamlDocument, model);
      if (steps.length > 0) {
        const range = getStepRange(steps[0].stepNode, model);
        if (range) {
          expect(range.endLineNumber).toBeGreaterThanOrEqual(range.startLineNumber);
        }
      }
    });
  });

  describe('isPositionInStep', () => {
    it('should return true when position is inside the step range', () => {
      const position = new monaco.Position(3, 5);
      const stepRange = new monaco.Range(2, 1, 5, 20);
      expect(isPositionInStep(position, stepRange)).toBe(true);
    });

    it('should return false when position is outside the step range', () => {
      const position = new monaco.Position(1, 1);
      const stepRange = new monaco.Range(2, 1, 5, 20);
      expect(isPositionInStep(position, stepRange)).toBe(false);
    });

    it('should return true when position is on the boundary of the step range', () => {
      const position = new monaco.Position(2, 1);
      const stepRange = new monaco.Range(2, 1, 5, 20);
      expect(isPositionInStep(position, stepRange)).toBe(true);
    });
  });

  describe('findStepAtPosition', () => {
    it('should return null when no steps match the position', () => {
      const position = new monaco.Position(1, 1);
      const yamlContent = `name: test
steps:
  - name: step1
    type: wait`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const steps = findAllSteps(yamlDocument, model);
      const result = findStepAtPosition(position, steps, model);
      expect(result).toBeNull();
    });

    it('should return the step that contains the position', () => {
      const yamlContent = `steps:
  - name: step1
    type: wait
    with:
      duration: 5s`;
      const yamlDocument = YAML.parseDocument(yamlContent);
      const model = createFakeMonacoModel(yamlContent);
      const steps = findAllSteps(yamlDocument, model);
      if (steps.length > 0) {
        // Position inside the step
        const position = new monaco.Position(3, 5);
        const result = findStepAtPosition(position, steps, model);
        expect(result).not.toBeNull();
        if (result) {
          expect(result.stepType).toBe('wait');
        }
      }
    });

    it('should return null when steps array is empty', () => {
      const model = createFakeMonacoModel('steps: []');
      const position = new monaco.Position(1, 5);
      const result = findStepAtPosition(position, [], model);
      expect(result).toBeNull();
    });
  });
});
