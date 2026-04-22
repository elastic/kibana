/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { z } from '@kbn/zod/v4';
import type { PublicStepDefinition } from './types';
import type { PublicStepDefinitionOrLoader } from '../types';

/**
 * Registry for public-side workflow step definition.
 * Stores UI-related information (label, description, icon) for step types.
 * Accepts either a definition directly or a loader function that returns a promise of a definition.
 */
export class PublicStepRegistry {
  private readonly registry = new Map<string, PublicStepDefinition>();
  private readonly pending = new Set<Promise<void>>(); // Stores promises that are either in progress or have been rejected

  constructor(private readonly logger: Logger) {}

  /**
   * Register step definition.
   * @param definitionOrLoader - The step definition to register, or a function that returns a promise of the definition (e.g. for dynamic imports)
   * To skip step registration with async checks (like feature flags), the loader can resolve with undefined.
   */
  public register<
    Input extends z.ZodType = z.ZodType,
    Output extends z.ZodType = z.ZodType,
    Config extends z.ZodObject = z.ZodObject
  >(definitionOrLoader: PublicStepDefinitionOrLoader<Input, Output, Config>): void {
    if (typeof definitionOrLoader === 'function') {
      const promise = definitionOrLoader()
        .then((definition) => {
          if (definition) {
            this.addToRegistry(definition);
          }
        })
        .catch((error) => {
          this.logger.error('Failed to register step definition', { error });
        })
        .finally(() => {
          this.pending.delete(promise);
        });
      this.pending.add(promise);
    } else {
      this.addToRegistry(definitionOrLoader);
    }
  }

  /**
   * Add a step definition to the registry.
   * @param definition - The step definition to add
   * @throws Error if the step id is already registered
   */
  private addToRegistry<
    Input extends z.ZodType = z.ZodType,
    Output extends z.ZodType = z.ZodType,
    Config extends z.ZodObject = z.ZodObject
  >(definition: PublicStepDefinition<Input, Output, Config>): void {
    if (this.registry.has(definition.id)) {
      throw new Error(
        `Step definition for type "${definition.id}" is already registered. Each step type must have unique definition.`
      );
    }
    this.registry.set(definition.id, definition as PublicStepDefinition);
  }

  /**
   * Returns a promise that resolves when all pending async loaders have settled.
   * Use before reading the registry if you need to guarantee all async registrations are complete.
   */
  public async whenReady(): Promise<void> {
    if (this.pending.size > 0) {
      await Promise.allSettled(this.pending);
    }
  }

  /**
   * Get definition for a specific step type.
   * @param stepTypeId - The step type identifier
   * @returns The step definition, or undefined if not found
   */
  public get(stepTypeId: string): PublicStepDefinition | undefined {
    return this.registry.get(stepTypeId);
  }

  /**
   * Check if definition for a step type is registered.
   * @param stepTypeId - The step type identifier
   * @returns True if definition for the step type is registered, false otherwise
   */
  public has(stepTypeId: string): boolean {
    return this.registry.has(stepTypeId);
  }

  /**
   * Get all registered step definition.
   * @returns Array of all registered step definition
   */
  public getAll(): PublicStepDefinition[] {
    return Array.from(this.registry.values());
  }
}
