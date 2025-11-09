/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { StepTypeDefinition } from '@kbn/workflows';

/**
 * Registry for custom workflow step types.
 *
 * This registry allows plugins to register custom step type implementations
 * that can be used in workflows. It follows the same pattern as other Kibana
 * registries (e.g., ActionTypeRegistry, RuleTypeRegistry).
 *
 * @example
 * ```typescript
 * const registry = new StepTypeRegistry(logger);
 * registry.register({
 *   id: 'custom_step',
 *   title: 'Custom Step',
 *   inputSchema: z.object({ value: z.string() }),
 *   outputSchema: z.object({ result: z.string() }),
 *   handler: async (context) => ({ output: { result: 'done' } })
 * });
 * ```
 */
export class StepTypeRegistry {
  private readonly stepTypes = new Map<string, StepTypeDefinition>();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Register a new custom step type.
   *
   * @param definition - The step type definition including id, schemas, and handler
   * @throws Error if a step type with the same id is already registered
   */
  public register(definition: StepTypeDefinition): void {
    if (this.stepTypes.has(definition.id)) {
      throw new Error(
        `Step type with id "${definition.id}" is already registered. Each step type must have a unique id.`
      );
    }

    // Validate the definition
    this.validateDefinition(definition);

    this.stepTypes.set(definition.id, definition);
    this.logger.debug(`Registered custom step type: ${definition.id}`);
  }

  /**
   * Get a registered step type by id.
   *
   * @param id - The step type id
   * @returns The step type definition, or undefined if not found
   */
  public get(id: string): StepTypeDefinition | undefined {
    return this.stepTypes.get(id);
  }

  /**
   * Check if a step type is registered.
   *
   * @param id - The step type id
   * @returns true if the step type is registered
   */
  public has(id: string): boolean {
    return this.stepTypes.has(id);
  }

  /**
   * Get all registered step type ids.
   *
   * @returns Array of registered step type ids
   */
  public getAllIds(): string[] {
    return Array.from(this.stepTypes.keys());
  }

  /**
   * Get all registered step type definitions.
   *
   * @returns Array of all registered step type definitions
   */
  public getAll(): StepTypeDefinition[] {
    return Array.from(this.stepTypes.values());
  }

  /**
   * Get metadata for all registered step types (without handler functions).
   * This is useful for exposing step type information to the UI.
   *
   * @returns Array of step type metadata (id, title, description)
   */
  public getAllMetadata(): Array<{ id: string; title: string; description?: string }> {
    return Array.from(this.stepTypes.values()).map((def) => ({
      id: def.id,
      title: def.title,
      description: def.description,
    }));
  }

  /**
   * Validate a step type definition.
   *
   * @param definition - The step type definition to validate
   * @throws Error if the definition is invalid
   */
  private validateDefinition(definition: StepTypeDefinition): void {
    if (!definition.id || typeof definition.id !== 'string') {
      throw new Error('Step type definition must have a valid "id" string property');
    }

    if (!definition.title || typeof definition.title !== 'string') {
      throw new Error(`Step type "${definition.id}" must have a valid "title" string property`);
    }

    if (!definition.inputSchema) {
      throw new Error(`Step type "${definition.id}" must have an "inputSchema" property`);
    }

    if (!definition.outputSchema) {
      throw new Error(`Step type "${definition.id}" must have an "outputSchema" property`);
    }

    if (!definition.handler || typeof definition.handler !== 'function') {
      throw new Error(`Step type "${definition.id}" must have a "handler" function`);
    }

    // Validate that id doesn't conflict with built-in step types
    const reservedPrefixes = ['http', 'elasticsearch.', 'kibana.', 'wait'];
    const isReserved = reservedPrefixes.some(
      (prefix) => definition.id === prefix || definition.id.startsWith(prefix)
    );

    if (isReserved) {
      throw new Error(
        `Step type id "${definition.id}" uses a reserved prefix. ` +
          `Custom step types cannot start with: ${reservedPrefixes.join(', ')}`
      );
    }
  }
}
