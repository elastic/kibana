/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type YAML from 'yaml';
import { isMap, isPair, isScalar, parseDocument } from 'yaml';
import {
  isInScheduledTriggerWithBlock,
  isInStepsContext,
  isInTriggersContext,
  isInWorkflowInputsByPosition,
  isInWorkflowInputsPath,
} from './triggers_utils';
import type { StepInfo } from '../../../../../entities/workflows/store/workflow_detail/utils/build_workflow_lookup';

/**
 * Helper to build a StepInfo from a real YAML document containing a single step
 * at the root level (not under a steps: key). The YAML should look like:
 *   name: exec
 *   type: workflow.execute
 *   with:
 *     inputs: ...
 */
function buildStepInfoFromYaml(yamlContent: string, stepId: string, stepType: string): StepInfo {
  const doc = parseDocument(yamlContent);
  const rootMap = doc.contents;
  if (!isMap(rootMap)) {
    throw new Error('Expected root to be a YAML map');
  }

  // Find with.inputs key node (if present)
  const propInfos: Record<string, StepInfo['propInfos'][string]> = {};
  const withPair = rootMap.items.find(
    (item) => isPair(item) && isScalar(item.key) && item.key.value === 'with'
  );
  if (withPair && isPair(withPair) && isMap(withPair.value)) {
    const inputsPair = withPair.value.items.find(
      (item) => isPair(item) && isScalar(item.key) && item.key.value === 'inputs'
    );
    if (inputsPair && isPair(inputsPair) && isScalar(inputsPair.key)) {
      propInfos['with.inputs'] = {
        path: ['with', 'inputs'],
        keyNode: inputsPair.key,
        valueNode: inputsPair.value as YAML.Scalar,
      };
    }
  }

  return {
    stepId,
    stepType,
    stepYamlNode: rootMap,
    lineStart: 1,
    lineEnd: yamlContent.split('\n').length,
    propInfos,
  };
}

describe('triggers_utils', () => {
  describe('isInTriggersContext', () => {
    it('should return true when path starts with triggers', () => {
      expect(isInTriggersContext(['triggers'])).toBe(true);
    });

    it('should return true when path is triggers with nested items', () => {
      expect(isInTriggersContext(['triggers', 0, 'with'])).toBe(true);
    });

    it('should return false when path is empty', () => {
      expect(isInTriggersContext([])).toBe(false);
    });

    it('should return false when path starts with something else', () => {
      expect(isInTriggersContext(['steps', 0])).toBe(false);
    });

    it('should return false when triggers is not the first element', () => {
      expect(isInTriggersContext(['steps', 0, 'triggers'])).toBe(false);
    });
  });

  describe('isInStepsContext', () => {
    it('should return true when path starts with steps', () => {
      expect(isInStepsContext(['steps'])).toBe(true);
    });

    it('should return true when path is steps with nested items', () => {
      expect(isInStepsContext(['steps', 0, 'with'])).toBe(true);
    });

    it('should return false when path is empty', () => {
      expect(isInStepsContext([])).toBe(false);
    });

    it('should return false when path starts with something else', () => {
      expect(isInStepsContext(['triggers', 0])).toBe(false);
    });
  });

  describe('isInWorkflowInputsPath', () => {
    it('should return true when path contains with followed by inputs', () => {
      expect(isInWorkflowInputsPath(['steps', 0, 'with', 'inputs', 'key1'])).toBe(true);
    });

    it('should return true at minimum depth', () => {
      expect(isInWorkflowInputsPath(['with', 'inputs', 'something'])).toBe(true);
    });

    it('should return false when path has with but no inputs', () => {
      expect(isInWorkflowInputsPath(['steps', 0, 'with', 'message'])).toBe(false);
    });

    it('should return false when path has inputs but no with before it', () => {
      expect(isInWorkflowInputsPath(['steps', 0, 'inputs'])).toBe(false);
    });

    it('should return false for empty path', () => {
      expect(isInWorkflowInputsPath([])).toBe(false);
    });

    it('should return false when with is the last element (no inputs after it)', () => {
      expect(isInWorkflowInputsPath(['steps', 0, 'with'])).toBe(false);
    });
  });

  describe('isInWorkflowInputsByPosition', () => {
    it('should return false when focusedStepInfo is null', () => {
      expect(isInWorkflowInputsByPosition(null, 100)).toBe(false);
    });

    it('should return false when step has no with.inputs propInfo', () => {
      const stepInfo = buildStepInfoFromYaml(
        'name: step1\ntype: workflow.execute',
        'step1',
        'workflow.execute'
      );
      expect(isInWorkflowInputsByPosition(stepInfo, 100)).toBe(false);
    });

    it('should return false when keyNode has no range', () => {
      const stepInfo = buildStepInfoFromYaml(
        'name: step1\ntype: workflow.execute',
        'step1',
        'workflow.execute'
      );
      // Manually override propInfos with a keyNode that has no range
      stepInfo.propInfos = {
        'with.inputs': {
          path: ['with', 'inputs'],
          keyNode: { value: 'inputs' } as unknown as YAML.Scalar,
          valueNode: {} as unknown as YAML.Scalar,
        },
      };
      expect(isInWorkflowInputsByPosition(stepInfo, 100)).toBe(false);
    });

    it('should return false when offset is before or at the inputs key end', () => {
      const yamlContent = `name: exec
type: workflow.execute
with:
  workflow-id: wf1
  inputs:
    key1: value1
  await: true`;
      const stepInfo = buildStepInfoFromYaml(yamlContent, 'exec', 'workflow.execute');
      const inputsProp = stepInfo.propInfos['with.inputs'];
      expect(inputsProp).toBeDefined();
      // offset at or before the inputs key end should return false
      const keyEnd = inputsProp.keyNode.range![2];
      expect(isInWorkflowInputsByPosition(stepInfo, keyEnd)).toBe(false);
      expect(isInWorkflowInputsByPosition(stepInfo, keyEnd - 5)).toBe(false);
    });

    it('should return true when offset is after inputs key and before upper bound', () => {
      const yamlContent = `name: exec
type: workflow.execute
with:
  workflow-id: wf1
  inputs:
    key1: value1
  await: true`;
      const stepInfo = buildStepInfoFromYaml(yamlContent, 'exec', 'workflow.execute');
      const inputsProp = stepInfo.propInfos['with.inputs'];
      expect(inputsProp).toBeDefined();
      // offset after the inputs key end but before await:
      const keyEnd = inputsProp.keyNode.range![2];
      expect(isInWorkflowInputsByPosition(stepInfo, keyEnd + 5)).toBe(true);
    });

    it('should return false when offset is past the upper bound (next sibling key)', () => {
      const yamlContent = `name: exec
type: workflow.execute
with:
  workflow-id: wf1
  inputs:
    key1: value1
  await: true`;
      const stepInfo = buildStepInfoFromYaml(yamlContent, 'exec', 'workflow.execute');
      // offset at the "await:" key should be past the upper bound
      const awaitOffset = yamlContent.indexOf('await:');
      expect(isInWorkflowInputsByPosition(stepInfo, awaitOffset + 5)).toBe(false);
    });

    it('should use with map end as bound when inputs is the last key in with', () => {
      const yamlContent = `name: exec
type: workflow.execute
with:
  workflow-id: wf1
  inputs:
    key1: value1`;
      const stepInfo = buildStepInfoFromYaml(yamlContent, 'exec', 'workflow.execute');
      const inputsProp = stepInfo.propInfos['with.inputs'];
      expect(inputsProp).toBeDefined();
      const keyEnd = inputsProp.keyNode.range![2];
      // Should still be within bounds since inputs is the last key
      expect(isInWorkflowInputsByPosition(stepInfo, keyEnd + 3)).toBe(true);
    });
  });

  describe('isInScheduledTriggerWithBlock', () => {
    it('should return false for a document with no triggers', () => {
      const yamlContent = `steps:
  - name: step1
    type: wait`;
      const yamlDocument = parseDocument(yamlContent);
      expect(isInScheduledTriggerWithBlock(yamlDocument, 10)).toBe(false);
    });

    it('should return false for a non-scheduled trigger', () => {
      const yamlContent = `triggers:
  - type: alert
    with:
      rule_type: some_rule`;
      const yamlDocument = parseDocument(yamlContent);
      const withOffset = yamlContent.indexOf('rule_type');
      expect(isInScheduledTriggerWithBlock(yamlDocument, withOffset)).toBe(false);
    });

    it('should return false when cursor is on existing every configuration', () => {
      const yamlContent = `triggers:
  - type: scheduled
    with:
      every: 5m`;
      const yamlDocument = parseDocument(yamlContent);
      const withOffset = yamlContent.indexOf('every');
      expect(isInScheduledTriggerWithBlock(yamlDocument, withOffset)).toBe(false);
    });

    it('should return true for cursor in empty scheduled trigger with block', () => {
      const yamlContent = `triggers:
  - type: scheduled
    with: {}`;
      const yamlDocument = parseDocument(yamlContent);
      const withOffset = yamlContent.indexOf('with:') + 6;
      expect(isInScheduledTriggerWithBlock(yamlDocument, withOffset)).toBe(true);
    });

    it('should return false for existing rrule configuration', () => {
      const yamlContent = `triggers:
  - type: scheduled
    with:
      rrule: "FREQ=DAILY"`;
      const yamlDocument = parseDocument(yamlContent);
      const withOffset = yamlContent.indexOf('rrule');
      expect(isInScheduledTriggerWithBlock(yamlDocument, withOffset)).toBe(false);
    });

    it('should return false for existing every configuration', () => {
      const yamlContent = `triggers:
  - type: scheduled
    with:
      every: 5m`;
      const yamlDocument = parseDocument(yamlContent);
      const withOffset = yamlContent.indexOf('every');
      expect(isInScheduledTriggerWithBlock(yamlDocument, withOffset)).toBe(false);
    });

    it('should handle document with steps after scheduled trigger', () => {
      const yamlContent = `triggers:
  - type: scheduled
    with: {}
steps:
  - name: step1
    type: wait`;
      const yamlDocument = parseDocument(yamlContent);
      // Verify the function doesn't crash on a full document
      const withOffset = yamlContent.indexOf('with:');
      expect(typeof isInScheduledTriggerWithBlock(yamlDocument, withOffset)).toBe('boolean');
    });

    it('should handle scheduled trigger with null with value', () => {
      const yamlContent = `triggers:
  - type: scheduled
    with:`;
      const yamlDocument = parseDocument(yamlContent);
      const withKeyOffset = yamlContent.indexOf('with:');
      const afterWithOffset = withKeyOffset + 5;
      expect(isInScheduledTriggerWithBlock(yamlDocument, afterWithOffset)).toBe(true);
    });

    it('should handle boundary with next property in trigger', () => {
      const yamlContent = `triggers:
  - type: scheduled
    with: {}
    name: my-schedule`;
      const yamlDocument = parseDocument(yamlContent);
      const withOffset = yamlContent.indexOf('with:') + 6;
      expect(isInScheduledTriggerWithBlock(yamlDocument, withOffset)).toBe(true);
    });

    it('should use parent context boundary when no next property in trigger', () => {
      const yamlContent = `triggers:
  - type: scheduled
    with: {}
steps:
  - type: wait`;
      const yamlDocument = parseDocument(yamlContent);
      // Position inside the empty with block, before steps:
      const withOffset = yamlContent.indexOf('with:') + 6;
      expect(isInScheduledTriggerWithBlock(yamlDocument, withOffset)).toBe(true);
    });
  });
});
