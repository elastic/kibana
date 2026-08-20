/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ManualWorkflowEventDefinition } from '../../common';
import { validateManualWorkflowEventDefinition } from '../../common/manual_workflow_event_registry/validation';

export class ServerManualWorkflowEventRegistry {
  private readonly registry = new Map<string, ManualWorkflowEventDefinition>();
  private frozen = false;

  public register(definition: ManualWorkflowEventDefinition): void {
    if (this.frozen) {
      throw new Error(
        'Manual workflow event registration is only allowed during plugin setup. Cannot register after start.'
      );
    }

    validateManualWorkflowEventDefinition(definition);

    if (this.registry.has(definition.id)) {
      throw new Error(
        `Manual workflow event "${definition.id}" is already registered. Each event must have a unique identifier.`
      );
    }

    this.registry.set(definition.id, definition);
  }

  public freeze(): void {
    this.frozen = true;
  }

  public get(id: string): ManualWorkflowEventDefinition | undefined {
    return this.registry.get(id);
  }

  public has(id: string): boolean {
    return this.registry.has(id);
  }

  public list(): ManualWorkflowEventDefinition[] {
    return Array.from(this.registry.values());
  }
}
