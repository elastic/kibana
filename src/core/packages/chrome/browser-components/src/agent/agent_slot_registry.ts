/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';

/**
 * Global registry so agent_builder (plugin bundle) and core chrome (core bundle)
 * share one registration. Module-level state is duplicated per bundle otherwise.
 */
const REGISTRY_KEY = '__KIBANA_AGENT_WORKSPACE_SLOT__';

interface AgentWorkspaceRegistry {
  content: ComponentType | null;
  listeners: Set<() => void>;
}

const getRegistry = (): AgentWorkspaceRegistry => {
  if (typeof globalThis === 'undefined') {
    return { content: null, listeners: new Set() };
  }

  const globalRegistry = globalThis as unknown as Record<string, AgentWorkspaceRegistry | undefined>;
  if (!globalRegistry[REGISTRY_KEY]) {
    globalRegistry[REGISTRY_KEY] = { content: null, listeners: new Set() };
  }

  return globalRegistry[REGISTRY_KEY]!;
};

const notifyListeners = (registry: AgentWorkspaceRegistry) => {
  registry.listeners.forEach((listener) => listener());
};

/**
 * Registers the React component rendered in the chrome agent workspace slot.
 * Called by the Agent Builder plugin when agent-first chrome is enabled.
 */
export const registerAgentWorkspaceContent = (component: ComponentType): void => {
  const registry = getRegistry();
  registry.content = component;
  notifyListeners(registry);
};

export const unregisterAgentWorkspaceContent = (): void => {
  const registry = getRegistry();
  registry.content = null;
  notifyListeners(registry);
};

export const getAgentWorkspaceContent = (): ComponentType | null => getRegistry().content;

export const subscribeAgentWorkspaceContent = (onStoreChange: () => void): (() => void) => {
  const registry = getRegistry();
  registry.listeners.add(onStoreChange);
  return () => registry.listeners.delete(onStoreChange);
};
