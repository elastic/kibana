/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { conditionExamplesSchema } from './condition_examples_schema';
import type { PublicTriggerDefinition } from './types';

/**
 * Registry for public-side workflow trigger definitions.
 * Stores UI-related information (title, description, icon, eventSchema) for triggers.
 * KQL validation for conditionExamples/defaultCondition runs in a dynamically loaded chunk.
 */
export class PublicTriggerRegistry {
  private readonly registry = new Map<string, PublicTriggerDefinition>();
  /** Definitions with conditionExamples/defaultCondition are validated async; they sit here until validation passes. */
  private readonly pending = new Map<string, PublicTriggerDefinition>();
  /** Promises for in-flight KQL validations; whenReady() waits for these. */
  private readonly pendingValidationPromises = new Set<Promise<void>>();

  /**
   * Register a trigger definition.
   * Validates conditionExamples shape synchronously; KQL validation runs asynchronously (dynamic import).
   * Definitions with conditionExamples or defaultCondition appear in get/getAll after validation passes.
   * @param definition - The public trigger definition to register
   * @throws Error if a trigger with the same ID is already registered, or if conditionExamples shape is invalid
   */
  public register(definition: PublicTriggerDefinition): void {
    const id = String(definition.id);
    if (this.registry.has(id) || this.pending.has(id)) {
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
    }

    const needsKqlValidation =
      (definition.conditionExamples && definition.conditionExamples.length > 0) ||
      (definition.defaultCondition !== undefined && definition.defaultCondition !== '');

    if (!needsKqlValidation) {
      this.registry.set(id, definition);
      return;
    }

    this.pending.set(id, definition);
    const promise = this.validateAndPromote(id, definition);
    this.pendingValidationPromises.add(promise);
    promise.finally(() => {
      this.pendingValidationPromises.delete(promise);
    });
  }

  private validateAndPromote(id: string, definition: PublicTriggerDefinition): Promise<void> {
    return import('./validate_kql_conditions').then(
      ({ validateKqlConditions }) => {
        if (!this.pending.has(id)) return;

        const conditionsToValidate: string[] = [];
        if (definition.conditionExamples && definition.conditionExamples.length > 0) {
          conditionsToValidate.push(...definition.conditionExamples.map((ex) => ex.condition));
        }
        if (definition.defaultCondition !== undefined && definition.defaultCondition !== '') {
          conditionsToValidate.push(definition.defaultCondition);
        }

        const validation = validateKqlConditions(conditionsToValidate, definition.eventSchema);
        if (!validation.valid) {
          this.pending.delete(id);
          // eslint-disable-next-line no-console
          console.error(
            `[workflows_extensions] Trigger "${id}" was not registered: ${validation.error}`
          );
          return;
        }
        this.pending.delete(id);
        this.registry.set(id, definition);
      },
      (err) => {
        this.pending.delete(id);
        // eslint-disable-next-line no-console
        console.error(`[workflows_extensions] Failed to validate trigger "${id}":`, err);
      }
    );
  }

  /**
   * Resolves when all currently pending async KQL validations have completed.
   * Consumers that need the full trigger list (e.g. actions menu) should await this
   * after plugin start before reading getAllTriggerDefinitions().
   */
  public whenReady(): Promise<void> {
    const promises = Array.from(this.pendingValidationPromises);
    return promises.length > 0 ? Promise.all(promises).then(() => undefined) : Promise.resolve();
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
