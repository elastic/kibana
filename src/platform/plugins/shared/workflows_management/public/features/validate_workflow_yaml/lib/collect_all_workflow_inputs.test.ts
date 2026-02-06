/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LineCounter, parseDocument } from 'yaml';
import { collectAllWorkflowInputs } from './collect_all_workflow_inputs';

describe('collectAllWorkflowInputs', () => {
  it('should return empty array for workflow without workflow.execute steps', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: default_step
    type: console
    with:
      message: "Hello, world!"
  `;
    const lineCounter = new LineCounter();
    const yamlDocument = parseDocument(yaml, { lineCounter });
    const result = collectAllWorkflowInputs(yamlDocument, lineCounter);
    expect(result).toHaveLength(0);
  });

  it('should collect workflow inputs from workflow.execute and workflow.executeAsync steps', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: execute_workflow
    type: workflow.execute
    with:
      workflow-id: workflow-123
      inputs:
        people: ["alice", "bob"]
        greeting: "Hello"
  - name: execute_workflow_async
    type: workflow.executeAsync
    with:
      workflow-id: workflow-456
      inputs:
        threshold: 42
        enabled: true
  `;
    const lineCounter = new LineCounter();
    const yamlDocument = parseDocument(yaml, { lineCounter });
    const result = collectAllWorkflowInputs(yamlDocument, lineCounter);
    expect(result).toHaveLength(2);
    expect(result[0].workflowId).toBe('workflow-123');
    expect(result[0].inputs).toEqual({
      people: ['alice', 'bob'],
      greeting: 'Hello',
    });
    expect(result[0].id).toContain('workflow-inputs-workflow-123');
    expect(result[1].workflowId).toBe('workflow-456');
    expect(result[1].inputs).toEqual({
      threshold: 42,
      enabled: true,
    });
  });

  it('should collect workflow inputs from multiple workflow.execute steps', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: execute_workflow_1
    type: workflow.execute
    with:
      workflow-id: workflow-1
      inputs:
        name: "test1"
  - name: execute_workflow_2
    type: workflow.execute
    with:
      workflow-id: workflow-2
      inputs:
        value: 100
  `;
    const lineCounter = new LineCounter();
    const yamlDocument = parseDocument(yaml, { lineCounter });
    const result = collectAllWorkflowInputs(yamlDocument, lineCounter);
    expect(result).toHaveLength(2);
    expect(result[0].workflowId).toBe('workflow-1');
    expect(result[0].inputs).toEqual({ name: 'test1' });
    expect(result[1].workflowId).toBe('workflow-2');
    expect(result[1].inputs).toEqual({ value: 100 });
  });

  it('should handle workflow.execute step without inputs or with empty inputs', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: execute_workflow_1
    type: workflow.execute
    with:
      workflow-id: workflow-123
  - name: execute_workflow_2
    type: workflow.execute
    with:
      workflow-id: workflow-456
      inputs: {}
  `;
    const lineCounter = new LineCounter();
    const yamlDocument = parseDocument(yaml, { lineCounter });
    const result = collectAllWorkflowInputs(yamlDocument, lineCounter);
    expect(result).toHaveLength(2);
    expect(result[0].workflowId).toBe('workflow-123');
    expect(result[0].inputs).toBeUndefined();
    expect(result[1].workflowId).toBe('workflow-456');
    expect(result[1].inputs).toEqual({});
  });

  it('should collect workflow inputs from nested steps (foreach, if/else)', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: if_step
    type: if
    condition: true
    steps:
      - name: execute_sync
        type: workflow.execute
        with:
          workflow-id: workflow-sync
          inputs:
            mode: "sync"
    else:
      - name: execute_async
        type: workflow.executeAsync
        with:
          workflow-id: workflow-async
          inputs:
            mode: "async"
  `;
    const lineCounter = new LineCounter();
    const yamlDocument = parseDocument(yaml, { lineCounter });
    const result = collectAllWorkflowInputs(yamlDocument, lineCounter);
    expect(result).toHaveLength(2);
    expect(result[0].workflowId).toBe('workflow-sync');
    expect(result[0].inputs).toEqual({ mode: 'sync' });
    expect(result[1].workflowId).toBe('workflow-async');
    expect(result[1].inputs).toEqual({ mode: 'async' });
  });

  it('should handle complex input types (arrays, objects, numbers, booleans)', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: execute_workflow
    type: workflow.execute
    with:
      workflow-id: workflow-123
      inputs:
        people: ["alice", "bob", "charlie"]
        count: 42
        enabled: true
        metadata:
          key: "value"
          nested:
            deep: true
  `;
    const lineCounter = new LineCounter();
    const yamlDocument = parseDocument(yaml, { lineCounter });
    const result = collectAllWorkflowInputs(yamlDocument, lineCounter);
    expect(result).toHaveLength(1);
    expect(result[0].inputs).toEqual({
      people: ['alice', 'bob', 'charlie'],
      count: 42,
      enabled: true,
      metadata: {
        key: 'value',
        nested: {
          deep: true,
        },
      },
    });
  });

  it('should return empty array when yamlDocument is null', () => {
    const result = collectAllWorkflowInputs(null as any, new LineCounter());
    expect(result).toHaveLength(0);
  });

  it('should return empty array when lineCounter is undefined', () => {
    const yaml = `
name: Test Workflow
steps:
  - name: execute_workflow
    type: workflow.execute
    with:
      workflow-id: workflow-123
      inputs:
        test: "value"
  `;
    const yamlDocument = parseDocument(yaml);
    const result = collectAllWorkflowInputs(yamlDocument, undefined);
    expect(result).toHaveLength(0);
  });
});
