/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { ManualWorkflowEventDefinition } from '../../common';
import { validateManualWorkflowEventDefinition } from '../../common/manual_workflow_event_registry/validation';
import type { ManualWorkflowEventDefinitionOrLoader } from '../types';

export class PublicManualWorkflowEventRegistry {
  private readonly registry = new Map<string, ManualWorkflowEventDefinition>();
  private readonly pending: Array<() => Promise<void>> = [];
  private whenReadyPromise: Promise<void> | undefined;
  private frozen = false;

  public register<EventSchema extends z.ZodType = z.ZodType>(
    definitionOrLoader: ManualWorkflowEventDefinitionOrLoader<EventSchema>
  ): void {
    if (this.frozen) {
      throw new Error(
        'Manual workflow event registration is only allowed during plugin setup. Cannot register after start.'
      );
    }

    if (typeof definitionOrLoader === 'function') {
      this.pending.push(async () => {
        const definition = await definitionOrLoader();
        if (!definition) {
          throw new Error('Manual workflow event definition is not loaded correctly.');
        }
        this.addToRegistry(definition);
      });
      return;
    }

    this.addToRegistry(definitionOrLoader);
  }

  public freeze(): void {
    this.frozen = true;
  }

  public async whenReady(): Promise<void> {
    this.whenReadyPromise ??= Promise.all(this.pending.map((loader) => loader())).then(() => {});
    return this.whenReadyPromise;
  }

  public get(id: string): ManualWorkflowEventDefinition | undefined {
    return this.registry.get(id);
  }

  public has(id: string): boolean {
    return this.registry.has(id);
  }

  public getAll(): ManualWorkflowEventDefinition[] {
    return Array.from(this.registry.values());
  }

  private addToRegistry<EventSchema extends z.ZodType = z.ZodType>(
    definition: ManualWorkflowEventDefinition<EventSchema>
  ): void {
    validateManualWorkflowEventDefinition(definition);

    if (this.registry.has(definition.id)) {
      throw new Error(
        `Manual workflow event "${definition.id}" is already registered. Each event must have a unique identifier.`
      );
    }

    this.registry.set(definition.id, definition as ManualWorkflowEventDefinition);
  }
}
