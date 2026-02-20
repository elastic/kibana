/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PublicTriggerDefinition,
  WorkflowsExtensionsPublicPluginStart,
} from '@kbn/workflows-extensions/public';

/**
 * Singleton that holds the workflows_extensions start contract and exposes
 * registered trigger definitions for the workflows_management UI (e.g. YAML editor suggestions).
 * Initialized during plugin start with workflowsExtensions (public).
 */
class TriggerSchemas {
  private extensions: WorkflowsExtensionsPublicPluginStart | null = null;

  public initialize(workflowsExtensions: WorkflowsExtensionsPublicPluginStart): void {
    this.extensions = workflowsExtensions;
  }

  /**
   * Returns all registered trigger definitions (id, title, description, icon).
   */
  public getTriggerDefinitions(): PublicTriggerDefinition[] {
    return this.extensions?.getAllTriggerDefinitions() ?? [];
  }

  /**
   * Returns registered trigger ids.
   */
  public getRegisteredIds(): string[] {
    return this.getTriggerDefinitions().map((t) => t.id);
  }

  /**
   * Returns whether the given id is a registered (custom) trigger type.
   */
  public isRegisteredTriggerId(id: string): boolean {
    return this.getTriggerDefinitions().some((t) => t.id === id);
  }
}

export const triggerSchemas = new TriggerSchemas();
export type { TriggerSchemas };
