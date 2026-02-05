/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { TriggerDefinition } from '../../common';

/** Id must be <domain>.<event> (e.g. cases.updated, alerts.recovered) */
const TRIGGER_ID_REGEX = /^[a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+$/;

function isZodObject(schema: z.ZodType): schema is z.ZodObject<z.ZodRawShape> {
  return typeof schema === 'object' && schema !== null && 'shape' in schema;
}

function validateDefinition(definition: TriggerDefinition): void {
  const { id, description, eventSchema, examples } = definition;

  if (typeof id !== 'string' || id.length === 0) {
    throw new Error('Trigger definition "id" must be a non-empty string.');
  }
  if (!TRIGGER_ID_REGEX.test(id)) {
    throw new Error(
      `Trigger id "${id}" must follow namespaced format <domain>.<event> (e.g. cases.updated).`
    );
  }
  if (typeof description !== 'string' || description.length === 0) {
    throw new Error(`Trigger "${id}": "description" must be a non-empty string.`);
  }
  if (!eventSchema || typeof eventSchema.safeParse !== 'function') {
    throw new Error(`Trigger "${id}": "eventSchema" must be a Zod schema.`);
  }
  if (!isZodObject(eventSchema)) {
    throw new Error(
      `Trigger "${id}": "eventSchema" must be a Zod object schema (e.g. z.object({...})).`
    );
  }

  if (examples !== undefined) {
    if (!Array.isArray(examples)) {
      throw new Error(`Trigger "${id}": "examples" must be an array.`);
    }
    for (let i = 0; i < examples.length; i++) {
      const ex = examples[i];
      if (!ex || typeof ex !== 'object' || ex === null) {
        throw new Error(`Trigger "${id}": example at index ${i} must be an object.`);
      }
      const result = eventSchema.safeParse(ex);
      if (!result.success) {
        const msg = result.error.issues?.map((e) => e.message).join('; ') ?? result.error.message;
        throw new Error(
          `Trigger "${id}": example at index ${i} does not match eventSchema: ${msg}`
        );
      }
    }
  }
}

/**
 * Registry for workflow trigger definitions.
 */
export class TriggerRegistry {
  private readonly registry = new Map<string, TriggerDefinition>();
  private frozen = false;

  /**
   * Register a trigger definition.
   * Must be called during plugin setup. Validates id format, required metadata, eventSchema (Zod object), and examples.
   *
   * @param definition - The trigger definition to register
   * @throws Error if trigger id is already registered, validation fails, or registration is attempted after setup
   */
  public register(definition: TriggerDefinition): void {
    if (this.frozen) {
      throw new Error(
        'Trigger registration is only allowed during plugin setup. Cannot register after start.'
      );
    }

    validateDefinition(definition);

    const id = String(definition.id);
    if (this.registry.has(id)) {
      throw new Error(
        `Trigger "${id}" is already registered. Each trigger must have a unique identifier.`
      );
    }
    this.registry.set(id, definition);
  }

  /**
   * Freeze the registry so no further registrations are allowed.
   * Called when the plugin starts; after this, only get/has/list are valid.
   */
  public freeze(): void {
    this.frozen = true;
  }

  /**
   * Get a trigger definition by id.
   *
   * @param triggerId - The trigger identifier
   * @returns The trigger definition, or undefined if not found
   */
  public get(triggerId: string): TriggerDefinition | undefined {
    return this.registry.get(triggerId);
  }

  /**
   * Check if a trigger is registered.
   *
   * @param triggerId - The trigger identifier
   * @returns True if the trigger is registered, false otherwise
   */
  public has(triggerId: string): boolean {
    return this.registry.has(triggerId);
  }

  /**
   * Get all registered trigger definitions.
   *
   * @returns Array of registered trigger definitions
   */
  public list(): TriggerDefinition[] {
    return Array.from(this.registry.values());
  }
}
