/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  conditionExamplesSchema,
  validateConditionExamples,
} from './condition_examples_schema';
import type { PublicTriggerDefinition } from './types';

/**
 * Registry for public-side workflow trigger definitions.
 * Stores UI-related information (title, description, icon, eventSchema) for triggers.
 */
export class PublicTriggerRegistry {
  private readonly registry = new Map<string, PublicTriggerDefinition>();

  /**
   * Register a trigger definition.
   * Validates conditionExamples shape and KQL (valid KQL, only event schema properties).
   * @param definition - The public trigger definition to register
   * @throws Error if a trigger with the same ID is already registered, or if any conditionExample.condition is invalid
   */
  public register(definition: PublicTriggerDefinition): void {
    const id = String(definition.id);
    if (this.registry.has(id)) {
      throw new Error(
        `Trigger definition for "${id}" is already registered. Each trigger must have a unique identifier.`
      );
    }
    if (definition.conditionExamples && definition.conditionExamples.length > 0) {
      const parseResult = conditionExamplesSchema.safeParse(definition.conditionExamples);
      if (!parseResult.success) {
        const message = parseResult.error.issues.map((e) => e.message).join('; ');
        throw new Error(
          `Trigger "${id}" has invalid conditionExamples: ${message}. The trigger was not registered.`
        );
      }
      const validation = validateConditionExamples(
        definition.conditionExamples,
        definition.eventSchema
      );
      if (!validation.valid) {
        throw new Error(
          `Trigger "${id}" has invalid conditionExamples: ${validation.error}. The trigger was not registered.`
        );
      }
    }
    this.registry.set(id, definition);
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
