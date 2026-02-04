/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import { buildWorkflowLookup, inspectStep } from './build_workflow_lookup';

describe('inspectStep', () => {
  describe('simple step parsing', () => {
    it('should parse a step with name and type', () => {
      const yaml = `
steps:
  - name: step1
    type: console
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result).toHaveProperty('step1');
      expect(result.step1.stepId).toBe('step1');
      expect(result.step1.stepType).toBe('console');
      expect(result.step1.stepYamlNode).toBeDefined();
      expect(result.step1.lineStart).toBeGreaterThan(0);
      expect(result.step1.lineEnd).toBeGreaterThanOrEqual(result.step1.lineStart);
      expect(result.step1.parentStepId).toBeUndefined();
    });

    it('should not include step without name', () => {
      const yaml = `
steps:
  - type: console
    message: "test"
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result).toEqual({});
    });

    it('should not include step without type', () => {
      const yaml = `
steps:
  - name: step1
    message: "test"
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result).toEqual({});
    });
  });

  describe('step properties', () => {
    it('should collect simple properties', () => {
      const yaml = `
steps:
  - name: step1
    type: console
    message: "Hello"
    enabled: true
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.step1.propInfos).toHaveProperty('message');
      expect(result.step1.propInfos).toHaveProperty('enabled');
      expect(result.step1.propInfos.message.path).toEqual(['message']);
      expect(result.step1.propInfos.message.valueNode.value).toBe('Hello');
      expect(result.step1.propInfos.enabled.valueNode.value).toBe(true);
    });

    it('should collect nested properties in with block', () => {
      const yaml = `
steps:
  - name: step1
    type: console
    with:
      message: "Hello"
      level: "info"
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect('with.message' in result.step1.propInfos).toBe(true);
      expect('with.level' in result.step1.propInfos).toBe(true);
      expect(result.step1.propInfos['with.message'].path).toEqual(['with', 'message']);
      expect(result.step1.propInfos['with.message'].valueNode.value).toBe('Hello');
      expect(result.step1.propInfos['with.level'].valueNode.value).toBe('info');
    });

    it('should exclude steps, else, and fallback from propInfos', () => {
      const yaml = `
steps:
  - name: step1
    type: if
    steps:
      - name: nested_step
        type: console
    else:
      - name: else_step
        type: console
    fallback:
      - name: fallback_step
        type: console
    message: "test"
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.step1.propInfos).not.toHaveProperty('steps');
      expect(result.step1.propInfos).not.toHaveProperty('else');
      expect(result.step1.propInfos).not.toHaveProperty('fallback');
      expect(result.step1.propInfos).toHaveProperty('message');
    });

    it('should collect deeply nested properties', () => {
      const yaml = `
steps:
  - name: step1
    type: console
    config:
      settings:
        timeout: 5000
        retries: 3
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect('config.settings.timeout' in result.step1.propInfos).toBe(true);
      expect('config.settings.retries' in result.step1.propInfos).toBe(true);
      expect(result.step1.propInfos['config.settings.timeout'].path).toEqual([
        'config',
        'settings',
        'timeout',
      ]);
      expect(result.step1.propInfos['config.settings.timeout'].valueNode.value).toBe(5000);
    });
  });

  describe('parent step ID', () => {
    it('should set parentStepId when provided', () => {
      const yaml = `
steps:
  - name: parent_step
    type: if
    steps:
      - name: child_step
        type: console
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.parent_step).toBeDefined();
      expect(result.parent_step.parentStepId).toBeUndefined();

      // Verify that child_step is found in the main result with correct parentStepId
      expect(result.child_step).toBeDefined();
      expect(result.child_step.parentStepId).toBe('parent_step');
    });

    it('should set parentStepId for nested steps in else block', () => {
      const yaml = `
steps:
  - name: if_step
    type: if
    condition: "{{ true }}"
    else:
      - name: else_step
        type: console
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.if_step).toBeDefined();
      expect(result.else_step).toBeDefined();
      expect(result.else_step.parentStepId).toBe('if_step');
    });

    it('should set parentStepId for nested steps in fallback block', () => {
      const yaml = `
steps:
  - name: try_step
    type: try
    steps:
      - name: try_step_content
        type: console
    fallback:
      - name: fallback_step
        type: console
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.try_step).toBeDefined();
      expect(result.try_step_content).toBeDefined();
      expect(result.try_step_content.parentStepId).toBe('try_step');
      expect(result.fallback_step).toBeDefined();
      expect(result.fallback_step.parentStepId).toBe('try_step');
    });

    it('should set parentStepId for deeply nested steps', () => {
      const yaml = `
steps:
  - name: level1
    type: if
    steps:
      - name: level2
        type: foreach
        steps:
          - name: level3
            type: console
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.level1).toBeDefined();
      expect(result.level1.parentStepId).toBeUndefined();

      expect(result.level2).toBeDefined();
      expect(result.level2.parentStepId).toBe('level1');

      expect(result.level3).toBeDefined();
      expect(result.level3.parentStepId).toBe('level2');
    });
  });

  describe('multiple steps', () => {
    it('should parse multiple steps in a sequence', () => {
      const yaml = `
steps:
  - name: step1
    type: console
  - name: step2
    type: console
  - name: step3
    type: console
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result).toHaveProperty('step1');
      expect(result).toHaveProperty('step2');
      expect(result).toHaveProperty('step3');
      expect(result.step1.stepType).toBe('console');
      expect(result.step2.stepType).toBe('console');
      expect(result.step3.stepType).toBe('console');
    });

    it('should handle steps with different types', () => {
      const yaml = `
steps:
  - name: console_step
    type: console
  - name: if_step
    type: if
  - name: foreach_step
    type: foreach
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.console_step.stepType).toBe('console');
      expect(result.if_step.stepType).toBe('if');
      expect(result.foreach_step.stepType).toBe('foreach');
    });
  });

  describe('nested steps', () => {
    it('should parse nested steps in if statement', () => {
      const yaml = `
steps:
  - name: if_step
    type: if
    condition: "{{ true }}"
    steps:
      - name: nested_step
        type: console
        message: "inside if"
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.if_step).toBeDefined();
      expect(result.nested_step).toBeDefined();
      expect(result.nested_step.parentStepId).toBe('if_step'); // parentStepId is now correctly set

      // Check nested step properties
      expect(result.nested_step.propInfos).toHaveProperty('message');
      expect(result.nested_step.propInfos.message.valueNode.value).toBe('inside if');
    });

    it('should parse nested steps in foreach loop', () => {
      const yaml = `
steps:
  - name: foreach_step
    type: foreach
    foreach: "{{ items }}"
    steps:
      - name: loop_body
        type: console
        message: "{{ item }}"
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.foreach_step).toBeDefined();
      expect(result.loop_body).toBeDefined();
      expect(result.loop_body.parentStepId).toBe('foreach_step'); // parentStepId is now correctly set
      expect(result.loop_body.propInfos).toHaveProperty('message');
    });
  });

  describe('edge cases', () => {
    it('should handle empty steps array', () => {
      const yaml = `
steps: []
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result).toEqual({});
    });

    it('should handle steps with only name and type', () => {
      const yaml = `
steps:
  - name: minimal_step
    type: console
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.minimal_step).toBeDefined();
      // name and type are included in propInfos since they're not excluded
      expect(result.minimal_step.propInfos).toHaveProperty('name');
      expect(result.minimal_step.propInfos).toHaveProperty('type');
    });

    it('should handle step with empty with block', () => {
      const yaml = `
steps:
  - name: step1
    type: console
    with: {}
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.step1).toBeDefined();
      // name and type are included in propInfos
      // Empty map values are not processed by visitStepProps (it only processes when value is a Map with items or Scalar)
      expect(result.step1.propInfos).toHaveProperty('name');
      expect(result.step1.propInfos).toHaveProperty('type');
      // Empty map may or may not be in propInfos depending on implementation
      // Let's just verify the step is parsed correctly
      expect(result.step1.stepId).toBe('step1');
      expect(result.step1.stepType).toBe('console');
    });

    it('should calculate correct line positions', () => {
      const yaml = `
steps:
  - name: step1
    type: console
    message: "test"
    enabled: true
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      // Line numbers are 1-indexed, accounting for the leading newline and "steps:" line
      expect(result.step1.lineStart).toBeGreaterThan(0);
      expect(result.step1.lineEnd).toBeGreaterThanOrEqual(result.step1.lineStart);
      // The step starts on the line with "- name: step1" which is line 3 (after empty line and "steps:")
      expect(result.step1.lineStart).toBe(3);
    });

    it('should handle step with special characters in name', () => {
      const yaml = `
steps:
  - name: step-with-dashes_and_underscores.123
    type: console
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result['step-with-dashes_and_underscores.123']).toBeDefined();
      expect(result['step-with-dashes_and_underscores.123'].stepId).toBe(
        'step-with-dashes_and_underscores.123'
      );
    });

    it('should preserve stepYamlNode reference', () => {
      const yaml = `
steps:
  - name: step1
    type: console
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      const stepNode = stepsNode.items[0];
      expect(result.step1.stepYamlNode).toBe(stepNode);
    });
  });

  describe('complex workflow structures', () => {
    it('should handle if-else-fallback structure', () => {
      const yaml = `
steps:
  - name: if_step
    type: if
    condition: "{{ value }}"
    steps:
      - name: true_branch
        type: console
        message: "true"
    else:
      - name: false_branch
        type: console
        message: "false"
    fallback:
      - name: error_branch
        type: console
        message: "error"
    timeout: 5000
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.if_step).toBeDefined();
      expect(result.if_step.propInfos).toHaveProperty('condition');
      expect(result.if_step.propInfos).toHaveProperty('timeout');
      expect(result.if_step.propInfos).not.toHaveProperty('steps');
      expect(result.if_step.propInfos).not.toHaveProperty('else');
      expect(result.if_step.propInfos).not.toHaveProperty('fallback');

      expect(result.true_branch).toBeDefined();
      expect(result.false_branch).toBeDefined();
      expect(result.error_branch).toBeDefined();
    });

    it('should handle deeply nested step hierarchies', () => {
      const yaml = `
steps:
  - name: level1
    type: if
    steps:
      - name: level2
        type: foreach
        steps:
          - name: level3
            type: if
            steps:
              - name: level4
                type: console
                message: "deeply nested"
`;
      const lineCounter = new LineCounter();
      const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
      const stepsNode = (yamlDocument.contents as any).get('steps');
      const result = inspectStep(stepsNode, lineCounter);

      expect(result.level1).toBeDefined();
      expect(result.level1.parentStepId).toBeUndefined();

      expect(result.level2).toBeDefined();
      expect(result.level2.parentStepId).toBe('level1');

      expect(result.level3).toBeDefined();
      expect(result.level3.parentStepId).toBe('level2');

      expect(result.level4).toBeDefined();
      expect(result.level4.parentStepId).toBe('level3');
      expect(result.level4.propInfos).toHaveProperty('message');
    });
  });
});

describe('buildWorkflowLookup', () => {
  it('should build a workflow lookup from a yaml string', () => {
    const yaml = `
name: test
steps:
  - name: step1
    type: console
`;
    const lineCounter = new LineCounter();
    const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
    const result = buildWorkflowLookup(yamlDocument, lineCounter);
    expect(result).toMatchObject({
      steps: {
        step1: {
          stepId: 'step1',
          stepType: 'console',
        },
      },
    });
  });

  it('should not treat inputs as steps', () => {
    const yaml = `
name: test
inputs:
  - name: people
    type: array
    default:
      - alice
      - bob
  - name: greeting
    type: string
    default: Hello
steps:
  - name: step1
    type: console
`;
    const lineCounter = new LineCounter();
    const yamlDocument = parseDocument(yaml, { lineCounter, keepSourceTokens: true });
    const result = buildWorkflowLookup(yamlDocument, lineCounter);

    // Should only have step1, not the inputs
    expect(Object.keys(result.steps)).toHaveLength(1);
    expect(result.steps).toHaveProperty('step1');
    expect(result.steps).not.toHaveProperty('people');
    expect(result.steps).not.toHaveProperty('greeting');
    expect(result.steps.step1.stepId).toBe('step1');
    expect(result.steps.step1.stepType).toBe('console');
  });
});
