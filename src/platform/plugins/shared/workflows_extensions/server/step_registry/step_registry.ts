/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ServerStepDefinition } from './types';

/**
 * Registry for server-side workflow step implementations.
 * Stores step handlers and definitions.
 */
export class ServerStepRegistry {
  private readonly registry = new Map<string, ServerStepDefinition>();

  /**
   * Register a step definition.
   * @param definition - The step definition to register
   * @throws Error if a step with the same ID is already registered
   */
  public register(definition: ServerStepDefinition): void {
    const stepTypeId = String(definition.id);
    if (this.registry.has(stepTypeId)) {
      throw new Error(
        `Step type "${stepTypeId}" is already registered. Each step type must have a unique identifier.`
      );
    }
    this.registry.set(stepTypeId, definition);
  }

  /**
   * Get a step definition for a given step type ID.
   * @param stepTypeId - The step type identifier
   * @returns The step definition, or undefined if not found
   */
  public get(stepTypeId: string): ServerStepDefinition | undefined {
    return this.registry.get(stepTypeId);
  }

  /**
   * Check if a step type is registered.
   * @param stepTypeId - The step type identifier
   * @returns True if the step type is registered, false otherwise
   */
  public has(stepTypeId: string): boolean {
    return this.registry.has(stepTypeId);
  }

  /**
   * Get all registered step definitions.
   * @returns Array of registered step definitions
   */
  public getAll(): ServerStepDefinition[] {
    return Array.from(this.registry.values());
  }
}
