/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionContextDefinition } from './types';

const EXECUTION_CONTEXT_TYPE_REGEX = /^[a-zA-Z0-9-]+\.[a-zA-Z0-9-]+$/;

const validateDefinition = (definition: WorkflowExecutionContextDefinition): void => {
  const { type } = definition;

  if (typeof type !== 'string' || type.length === 0) {
    throw new Error('Workflow execution context definition "type" must be a non-empty string.');
  }

  if (!EXECUTION_CONTEXT_TYPE_REGEX.test(type)) {
    throw new Error(
      `Workflow execution context type "${type}" must follow namespaced format <plugin>.<entity> (for example, "cases.case").`
    );
  }

  if (
    definition.onExecutionStarted !== undefined &&
    typeof definition.onExecutionStarted !== 'function'
  ) {
    throw new Error(
      `Workflow execution context definition "${type}" must provide "onExecutionStarted" as a function.`
    );
  }
};

/**
 * Setup-time registry for workflow execution context definitions.
 */
export class WorkflowExecutionContextRegistry {
  private readonly registry = new Map<string, WorkflowExecutionContextDefinition>();
  private frozen = false;

  public register(definition: WorkflowExecutionContextDefinition): void {
    if (this.frozen) {
      throw new Error(
        'Workflow execution context registration is only allowed during plugin setup. Cannot register after start.'
      );
    }

    validateDefinition(definition);

    if (this.registry.has(definition.type)) {
      throw new Error(
        `Workflow execution context definition for type "${definition.type}" is already registered. Each context type must have a unique definition.`
      );
    }

    this.registry.set(definition.type, definition);
  }

  public freeze(): void {
    this.frozen = true;
  }

  public get(type: string): WorkflowExecutionContextDefinition | undefined {
    return this.registry.get(type);
  }

  public list(): WorkflowExecutionContextDefinition[] {
    return Array.from(this.registry.values());
  }
}
