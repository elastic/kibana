/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { PublicStepDefinition } from './types';

/**
 * Registry for public-side workflow step definition.
 * Stores UI-related information (label, description, icon) for step types.
 */
export class PublicStepRegistry {
  private readonly registry = new Map<string, PublicStepDefinition>();

  /**
   * Register step definition.
   * @param definition - The step definition to register
   * @throws Error if definition for the same step type ID is already registered
   */
  public register<
    Input extends z.ZodType = z.ZodType,
    Output extends z.ZodType = z.ZodType,
    Config extends z.ZodObject = z.ZodObject
  >(definition: PublicStepDefinition<Input, Output, Config>): void {
    const stepTypeId = String(definition.id);
    if (this.registry.has(stepTypeId)) {
      throw new Error(
        `Step definition for type "${stepTypeId}" is already registered. Each step type must have unique definition.`
      );
    }
    // Type assertion is safe here because the Map stores the base type
    // and we don't need to preserve specific generic types after storage
    this.registry.set(stepTypeId, definition as PublicStepDefinition);
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
