/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowsExtensionsPublicPluginStart } from '@kbn/workflows-extensions/public';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

export interface TriggerDefinitionSummary {
  id: string;
  title?: string;
  description?: string;
  /** Optional icon (e.g. EUI icon or React component). When set, used in YAML editor and suggestions; otherwise bolt is used. */
  icon?: unknown;
}

/** Minimal contract used internally so the same code works on public and server. */
interface TriggerDefinitionsProvider {
  getTriggerDefinitions(): TriggerDefinitionSummary[];
}

function hasGetAllTriggerDefinitions(
  ext: WorkflowsExtensionsPublicPluginStart | WorkflowsExtensionsServerPluginStart
): ext is WorkflowsExtensionsPublicPluginStart {
  return 'getAllTriggerDefinitions' in ext && typeof ext.getAllTriggerDefinitions === 'function';
}

function hasListTriggers(
  ext: WorkflowsExtensionsPublicPluginStart | WorkflowsExtensionsServerPluginStart
): ext is WorkflowsExtensionsServerPluginStart {
  return 'listTriggers' in ext && typeof ext.listTriggers === 'function';
}

/**
 * Builds a provider from the workflows_extensions start contract (public or server).
 * Public contract yields full summaries (id, title, description, icon); server yields id-only.
 */
function createTriggerDefinitionsProvider(
  ext: WorkflowsExtensionsPublicPluginStart | WorkflowsExtensionsServerPluginStart
): TriggerDefinitionsProvider {
  if (hasGetAllTriggerDefinitions(ext)) {
    return {
      getTriggerDefinitions: () => {
        const list = ext.getAllTriggerDefinitions();
        if (!list?.length) return [];
        return list.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          icon: t.icon,
        }));
      },
    };
  }
  if (hasListTriggers(ext)) {
    return {
      getTriggerDefinitions: () => {
        const list = ext.listTriggers();
        if (!list?.length) return [];
        return list.map((t) => ({ id: t.id }));
      },
    };
  }
  return { getTriggerDefinitions: () => [] };
}

/**
 * Singleton that holds the workflows_extensions start contract and exposes
 * registered trigger definitions for the workflows_management UI (e.g. YAML editor suggestions).
 * Initialized during plugin start with workflowsExtensions (public or server).
 */
class TriggerSchemas {
  private provider: TriggerDefinitionsProvider | null = null;

  public initialize(
    workflowsExtensions: WorkflowsExtensionsPublicPluginStart | WorkflowsExtensionsServerPluginStart
  ): void {
    this.provider = createTriggerDefinitionsProvider(workflowsExtensions);
  }

  /**
   * Returns all registered trigger definitions.
   * On the public side this includes title, description, and icon when available;
   * on the server side only id is set.
   */
  public getTriggerDefinitions(): TriggerDefinitionSummary[] {
    return this.provider?.getTriggerDefinitions() ?? [];
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
