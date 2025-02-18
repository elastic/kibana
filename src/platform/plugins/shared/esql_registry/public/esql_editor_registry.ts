/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLEditorOverrides } from './types';

export class ESQLEditorRegistry {
  private registry: Map<string, ESQLEditorOverrides>;

  constructor() {
    this.registry = new Map();
  }

  // Set overrides for a specific index pattern
  setOverride(indexPattern: string, overrides: ESQLEditorOverrides) {
    this.registry.set(indexPattern, overrides);
  }

  // Get overrides for a specific index pattern
  getOverride(indexPattern: string): ESQLEditorOverrides | undefined {
    return this.registry.get(indexPattern);
  }

  // Remove overrides for a specific index pattern
  deleteOverride(indexPattern: string): boolean {
    return this.registry.delete(indexPattern);
  }

  // Get all overrides (for debugging or UI purposes)
  getAllOverrides(): Record<string, ESQLEditorOverrides> {
    return Object.fromEntries(this.registry);
  }
}
