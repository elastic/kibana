/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowExecutionContextRegistry } from './execution_context_registry';
import {
  createWorkflowExecutionContextDefinition,
  type WorkflowExecutionContextDefinition,
} from './types';

const createDefinition = (
  overrides: Partial<WorkflowExecutionContextDefinition> = {}
): WorkflowExecutionContextDefinition => ({
  type: 'cases.case',
  ...overrides,
});

describe('WorkflowExecutionContextRegistry', () => {
  let registry: WorkflowExecutionContextRegistry;

  beforeEach(() => {
    registry = new WorkflowExecutionContextRegistry();
  });

  it('registers and resolves definitions by context type', () => {
    const definition = createDefinition();

    registry.register(definition);

    expect(registry.get('cases.case')).toBe(definition);
    expect(registry.list()).toEqual([definition]);
  });

  it('returns undefined and an empty list when no definitions are registered', () => {
    expect(registry.get('cases.case')).toBeUndefined();
    expect(registry.list()).toEqual([]);
  });

  it('lists definitions in registration order', () => {
    const casesDefinition = createDefinition();
    const alertsDefinition = createDefinition({ type: 'security.alert' });

    registry.register(casesDefinition);
    registry.register(alertsDefinition);

    expect(registry.list()).toEqual([casesDefinition, alertsDefinition]);
  });

  it('rejects duplicate context type registrations', () => {
    registry.register(createDefinition());

    expect(() => registry.register(createDefinition())).toThrow(
      'Workflow execution context definition for type "cases.case" is already registered'
    );
  });

  it('rejects invalid context types', () => {
    expect(() => registry.register(createDefinition({ type: '' }))).toThrow(
      '"type" must be a non-empty string'
    );
    expect(() => registry.register(createDefinition({ type: 'case' }))).toThrow(
      'must follow namespaced format <plugin>.<entity>'
    );
  });

  it('rejects registration after freeze while preserving read access', () => {
    const definition = createDefinition();
    registry.register(definition);
    registry.freeze();

    expect(() => registry.register(createDefinition({ type: 'security.alert' }))).toThrow(
      'only allowed during plugin setup'
    );
    expect(registry.get('cases.case')).toBe(definition);
    expect(registry.list()).toEqual([definition]);
  });
});

describe('createWorkflowExecutionContextDefinition', () => {
  it('preserves the definition and its context type literal', () => {
    const definition = createWorkflowExecutionContextDefinition({
      type: 'cases.case',
      onExecutionStarted: async ({ executionContext }) => {
        const contextType: 'cases.case' = executionContext.type;
        void contextType;
      },
    });
    const definitionType: 'cases.case' = definition.type;

    expect(definitionType).toBe('cases.case');
  });
});
