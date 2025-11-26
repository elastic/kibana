/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { StepMetadata } from '../types';

/**
 * Registry for public-side workflow step metadata.
 * Stores UI-related information (label, description, icon) for step types.
 */
export class PublicStepRegistry {
  private readonly registry = new Map<string, StepMetadata>();

  /**
   * Register step metadata.
   * @param metadata - The step metadata to register
   * @throws Error if metadata for the same step type ID is already registered
   */
  public register(metadata: StepMetadata): void {
    const stepTypeId = String(metadata.id);
    if (this.registry.has(stepTypeId)) {
      throw new Error(
        `Step metadata for type "${stepTypeId}" is already registered. Each step type must have unique metadata.`
      );
    }
    this.registry.set(stepTypeId, metadata);
  }

  /**
   * Get metadata for a specific step type.
   * @param stepTypeId - The step type identifier
   * @returns The step metadata, or undefined if not found
   */
  public get(stepTypeId: string): StepMetadata | undefined {
    return this.registry.get(stepTypeId);
  }

  /**
   * Check if metadata for a step type is registered.
   * @param stepTypeId - The step type identifier
   * @returns True if metadata for the step type is registered, false otherwise
   */
  public has(stepTypeId: string): boolean {
    return this.registry.has(stepTypeId);
  }

  /**
   * Get all registered step metadata.
   * @returns Array of all registered step metadata
   */
  public getAll(): StepMetadata[] {
    return Array.from(this.registry.values());
  }
}
