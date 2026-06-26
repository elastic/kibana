/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType, PropsWithChildren } from 'react';

const REGISTRY_KEY = '__kbnAgentFirstAttachmentCoordinatorRegistry__';

interface AgentFirstCoordinatorRegistry {
  provider: ComponentType<PropsWithChildren> | null;
  listeners: Set<() => void>;
}

const getRegistry = (): AgentFirstCoordinatorRegistry => {
  const globalRegistry = globalThis as unknown as Record<
    string,
    AgentFirstCoordinatorRegistry | undefined
  >;

  if (!globalRegistry[REGISTRY_KEY]) {
    globalRegistry[REGISTRY_KEY] = {
      provider: null,
      listeners: new Set(),
    };
  }

  return globalRegistry[REGISTRY_KEY]!;
};

const notifyListeners = (registry: AgentFirstCoordinatorRegistry) => {
  registry.listeners.forEach((listener) => listener());
};

export const registerAgentFirstAttachmentCoordinator = (
  provider: ComponentType<PropsWithChildren>
): (() => void) => {
  const registry = getRegistry();
  registry.provider = provider;
  notifyListeners(registry);

  return () => {
    if (registry.provider === provider) {
      registry.provider = null;
      notifyListeners(registry);
    }
  };
};

export const getAgentFirstAttachmentCoordinator = (): ComponentType<PropsWithChildren> | null =>
  getRegistry().provider;

export const subscribeAgentFirstAttachmentCoordinator = (onStoreChange: () => void): (() => void) => {
  const registry = getRegistry();
  registry.listeners.add(onStoreChange);

  return () => {
    registry.listeners.delete(onStoreChange);
  };
};
