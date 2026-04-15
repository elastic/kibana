/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { PublicTriggerDefinition } from './types';
import type { PublicTriggerDefinitionOrLoader } from '../types';

/**
 * Registry for public-side workflow trigger definitions.
 * Stores UI-related information (title, description, icon, eventSchema, snippets) for triggers.
 */
export class PublicTriggerRegistry {
  private readonly registry = new Map<string, PublicTriggerDefinition>();
  private readonly pending = new Set<Promise<void>>();

  /**
   * Register a trigger definition.
   * @param definitionOrLoader - The trigger definition to register, or a function that returns a promise of the definition (e.g. for dynamic imports)
   * @throws Error if a trigger with the same ID is already registered
   */
  public register<EventSchema extends z.ZodType = z.ZodType>(
    definitionOrLoader: PublicTriggerDefinitionOrLoader<EventSchema>
  ): void {
    if (typeof definitionOrLoader === 'function') {
      const promise = definitionOrLoader().then((definition) => {
        if (!definition) {
          throw new Error('Trigger definition is not loaded correctly');
        }
        this.addToRegistry(definition);
        this.pending.delete(promise);
      });
      this.pending.add(promise);
    } else {
      this.addToRegistry(definitionOrLoader);
    }
  }

  /**
   * Add a trigger definition to the registry.
   * @param definition - The trigger definition to add
   * @throws Error if the trigger id is already registered
   */
  private addToRegistry<EventSchema extends z.ZodType = z.ZodType>(
    definition: PublicTriggerDefinition<EventSchema>
  ): void {
    const id = String(definition.id);
    if (this.registry.has(id)) {
      throw new Error(
        `Trigger definition for "${id}" is already registered. Each trigger must have a unique identifier.`
      );
    }
    this.registry.set(id, definition as PublicTriggerDefinition);
  }

  /**
   * Returns a promise that resolves when all pending async loaders have settled.
   * Use before reading the registry if you need to guarantee all async registrations are complete.
   */
  public async whenReady(): Promise<void> {
    if (this.pending.size > 0) {
      await Promise.all(Array.from(this.pending));
    }
  }

  /**
   * Get a trigger definition by id.
   * @param triggerId - The trigger identifier
   * @returns The trigger definition, or undefined if not found
   */
  public get(triggerId: string): PublicTriggerDefinition | undefined {
    return this.registry.get(triggerId);
  }

  /**
   * Check if a trigger is registered.
   * @param triggerId - The trigger identifier
   * @returns True if the trigger is registered, false otherwise
   */
  public has(triggerId: string): boolean {
    return this.registry.has(triggerId);
  }

  /**
   * Get all registered trigger definitions.
   * @returns Array of registered trigger definitions
   */
  public getAll(): PublicTriggerDefinition[] {
    return Array.from(this.registry.values());
  }
}
