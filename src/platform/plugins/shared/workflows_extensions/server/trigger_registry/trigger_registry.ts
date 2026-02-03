/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServerTriggerDefinition } from './types';

/**
 * Registry for server-side workflow trigger implementations.
 * Stores trigger definitions and configurations.
 */
export class ServerTriggerRegistry {
  private readonly registry = new Map<string, ServerTriggerDefinition>();

  /**
   * Register a trigger definition.
   * @param definition - The trigger definition to register
   * @throws Error if a trigger with the same ID is already registered
   */
  public register(definition: ServerTriggerDefinition): void {
    const triggerTypeId = String(definition.id);
    if (this.registry.has(triggerTypeId)) {
      throw new Error(
        `Trigger type "${triggerTypeId}" is already registered. Each trigger type must have a unique identifier.`
      );
    }
    this.registry.set(triggerTypeId, definition);
  }

  /**
   * Get a trigger definition for a given trigger type ID.
   * @param triggerTypeId - The trigger type identifier
   * @returns The trigger definition, or undefined if not found
   */
  public get(triggerTypeId: string): ServerTriggerDefinition | undefined {
    return this.registry.get(triggerTypeId);
  }

  /**
   * Check if a trigger type is registered.
   * @param triggerTypeId - The trigger type identifier
   * @returns True if the trigger type is registered, false otherwise
   */
  public has(triggerTypeId: string): boolean {
    return this.registry.has(triggerTypeId);
  }

  /**
   * Get all registered trigger definitions.
   * @returns Array of registered trigger definitions
   */
  public getAll(): ServerTriggerDefinition[] {
    return Array.from(this.registry.values());
  }
}
