/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type ESQLEditorExtensions } from './types';

export class ESQLEditorRegistry {
  private registry: Map<string, ESQLEditorExtensions>;

  constructor() {
    this.registry = new Map();
  }

  // Sets extensions for a specific index pattern
  setExtension(indexPattern: string, extensions: ESQLEditorExtensions) {
    if (!this.registry.has(indexPattern)) {
      this.registry.set(indexPattern, extensions);
    }
  }

  // Get extensions for a specific index pattern
  getExtension(indexPattern: string): ESQLEditorExtensions | undefined {
    return this.registry.get(indexPattern);
  }

  extensionExists(indexPattern: string): boolean {
    return this.registry.has(indexPattern);
  }

  // Get all extensions (for debugging or UI purposes)
  getAllExtensions(): Record<string, ESQLEditorExtensions> {
    return Object.fromEntries(this.registry);
  }
}
