/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDocument } from 'yaml';
import { getStepNode } from './get_step_node';

const parse = (yaml: string) => parseDocument(yaml);

describe('getStepNode', () => {
  describe('simple step finding', () => {
    it('should find a top-level step by name', () => {
      const doc = parse(`
steps:
  - name: step1
    type: console
`);
      const node = getStepNode(doc, 'step1');
      expect(node).not.toBeNull();
      expect(node!.get('name')).toBe('step1');
      expect(node!.get('type')).toBe('console');
    });

    it('should find a step among multiple siblings', () => {
      const doc = parse(`
steps:
  - name: step1
    type: console
  - name: step2
    type: action
  - name: step3
    type: foreach
`);
      const node = getStepNode(doc, 'step2');
      expect(node).not.toBeNull();
      expect(node!.get('name')).toBe('step2');
      expect(node!.get('type')).toBe('action');
    });

    it('should return null for non-existent step', () => {
      const doc = parse(`
steps:
  - name: step1
    type: console
`);
      expect(getStepNode(doc, 'does-not-exist')).toBeNull();
    });
  });

  describe('nested steps', () => {
    it('should find a step nested inside steps block', () => {
      const doc = parse(`
steps:
  - name: parent
    type: if
    steps:
      - name: child
        type: console
        message: "inside if"
`);
      const node = getStepNode(doc, 'child');
      expect(node).not.toBeNull();
      expect(node!.get('name')).toBe('child');
      expect(node!.get('type')).toBe('console');
    });

    it('should find a step nested inside else block', () => {
      const doc = parse(`
steps:
  - name: if_step
    type: if
    condition: "{{ true }}"
    steps:
      - name: true_branch
        type: console
    else:
      - name: else_branch
        type: console
`);
      const node = getStepNode(doc, 'else_branch');
      expect(node).not.toBeNull();
      expect(node!.get('name')).toBe('else_branch');
    });

    it('should find a step nested inside on-failure fallback block', () => {
      const doc = parse(`
steps:
  - name: try_step
    type: action
    connector-id: my-connector
    on-failure:
      fallback:
        - name: fallback_step
          type: console
          message: "recovery"
`);
      const node = getStepNode(doc, 'fallback_step');
      expect(node).not.toBeNull();
      expect(node!.get('name')).toBe('fallback_step');
      expect(node!.get('type')).toBe('console');
    });

    it('should find deeply nested steps', () => {
      const doc = parse(`
steps:
  - name: level1
    type: if
    steps:
      - name: level2
        type: foreach
        foreach: "{{ items }}"
        steps:
          - name: level3
            type: if
            steps:
              - name: level4
                type: console
                message: "deeply nested"
`);
      const node = getStepNode(doc, 'level4');
      expect(node).not.toBeNull();
      expect(node!.get('name')).toBe('level4');
      expect(node!.get('message')).toBe('deeply nested');
    });

    it('should find parent step when nested steps also exist', () => {
      const doc = parse(`
steps:
  - name: parent
    type: if
    condition: "{{ value }}"
    steps:
      - name: child
        type: console
`);
      const node = getStepNode(doc, 'parent');
      expect(node).not.toBeNull();
      expect(node!.get('name')).toBe('parent');
      expect(node!.get('type')).toBe('if');
    });
  });

  describe('if-else with on-failure sibling', () => {
    const doc = parse(`
steps:
  - name: if_step
    type: if
    condition: "{{ value }}"
    steps:
      - name: true_branch
        type: action
        connector-id: my-connector
        on-failure:
          fallback:
            - name: error_branch
              type: console
    else:
      - name: false_branch
        type: console
`);

    it('should find the parent if step', () => {
      expect(getStepNode(doc, 'if_step')).not.toBeNull();
    });

    it('should find the true branch step', () => {
      expect(getStepNode(doc, 'true_branch')).not.toBeNull();
    });

    it('should find the else branch step', () => {
      expect(getStepNode(doc, 'false_branch')).not.toBeNull();
    });

    it('should find the fallback step inside on-failure', () => {
      expect(getStepNode(doc, 'error_branch')).not.toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should return null for non-map root', () => {
      const doc = parseDocument('just a string');
      expect(getStepNode(doc, 'step1')).toBeNull();
    });

    it('should return null when no steps section exists', () => {
      const doc = parse(`
name: my-workflow
description: no steps here
`);
      expect(getStepNode(doc, 'step1')).toBeNull();
    });

    it('should return null for empty steps array', () => {
      const doc = parse(`
steps: []
`);
      expect(getStepNode(doc, 'step1')).toBeNull();
    });

    it('should not match inputs as steps', () => {
      const doc = parse(`
inputs:
  - name: people
    type: array
  - name: greeting
    type: string
steps:
  - name: step1
    type: console
`);
      expect(getStepNode(doc, 'people')).toBeNull();
      expect(getStepNode(doc, 'greeting')).toBeNull();
      expect(getStepNode(doc, 'step1')).not.toBeNull();
    });

    it('should handle step with special characters in name', () => {
      const doc = parse(`
steps:
  - name: step-with-dashes_and_underscores.123
    type: console
`);
      const node = getStepNode(doc, 'step-with-dashes_and_underscores.123');
      expect(node).not.toBeNull();
      expect(node!.get('name')).toBe('step-with-dashes_and_underscores.123');
    });

    it('should not recurse into non-step nested keys like with', () => {
      const doc = parse(`
steps:
  - name: outer
    type: action
    with:
      name: inner-value
      type: not-a-step
`);
      expect(getStepNode(doc, 'inner-value')).toBeNull();
      expect(getStepNode(doc, 'outer')).not.toBeNull();
    });
  });

  describe('node identity', () => {
    it('should return the same YAMLMap node from the document AST', () => {
      const doc = parse(`
steps:
  - name: step1
    type: console
`);
      const node = getStepNode(doc, 'step1');
      const stepsSeq = doc.getIn(['steps']) as any;
      expect(node).toBe(stepsSeq.items[0]);
    });

    it('should return a node with valid range', () => {
      const doc = parse(`
steps:
  - name: step1
    type: console
    message: "hello"
`);
      const node = getStepNode(doc, 'step1');
      expect(node).not.toBeNull();
      expect(node!.range).toBeDefined();
      expect(node!.range![0]).toBeGreaterThan(0);
      expect(node!.range![2]).toBeGreaterThan(node!.range![0]);
    });
  });
});
