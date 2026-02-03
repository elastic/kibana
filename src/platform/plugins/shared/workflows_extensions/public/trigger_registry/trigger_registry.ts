/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicTriggerDefinition } from './types';

/**
 * Registry for public-side workflow trigger definitions.
 * Stores UI-related information (label, description, icon) for trigger types.
 */
export class PublicTriggerRegistry {
  private readonly registry = new Map<string, PublicTriggerDefinition>();

  /**
   * Register trigger definition.
   * @param definition - The trigger definition to register
   * @throws Error if definition for the same trigger type ID is already registered
   */
  public register(definition: PublicTriggerDefinition): void {
    const triggerTypeId = String(definition.id);
    if (this.registry.has(triggerTypeId)) {
      throw new Error(
        `Trigger definition for type "${triggerTypeId}" is already registered. Each trigger type must have unique definition.`
      );
    }
    this.registry.set(triggerTypeId, definition);
  }

  /**
   * Get definition for a specific trigger type.
   * @param triggerTypeId - The trigger type identifier
   * @returns The trigger definition, or undefined if not found
   */
  public get(triggerTypeId: string): PublicTriggerDefinition | undefined {
    return this.registry.get(triggerTypeId);
  }

  /**
   * Check if definition for a trigger type is registered.
   * @param triggerTypeId - The trigger type identifier
   * @returns True if definition for the trigger type is registered, false otherwise
   */
  public has(triggerTypeId: string): boolean {
    return this.registry.has(triggerTypeId);
  }

  /**
   * Get all registered trigger definitions.
   * @returns Array of all registered trigger definitions
   */
  public getAll(): PublicTriggerDefinition[] {
    return Array.from(this.registry.values());
  }
}
