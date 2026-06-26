/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ComponentType } from 'react';

const REGISTRY_KEY = '__kbnAgentFirstApplicationAttachmentHarnessRegistry__';

interface ApplicationAttachmentHarnessRegistry {
  harness: ComponentType | null;
  listeners: Set<() => void>;
}

const getRegistry = (): ApplicationAttachmentHarnessRegistry => {
  const globalRegistry = globalThis as unknown as Record<
    string,
    ApplicationAttachmentHarnessRegistry | undefined
  >;

  if (!globalRegistry[REGISTRY_KEY]) {
    globalRegistry[REGISTRY_KEY] = {
      harness: null,
      listeners: new Set(),
    };
  }

  return globalRegistry[REGISTRY_KEY]!;
};

const notifyListeners = (registry: ApplicationAttachmentHarnessRegistry) => {
  registry.listeners.forEach((listener) => listener());
};

export const registerApplicationAttachmentHarness = (harness: ComponentType): (() => void) => {
  const registry = getRegistry();
  registry.harness = harness;
  notifyListeners(registry);

  return () => {
    if (registry.harness === harness) {
      registry.harness = null;
      notifyListeners(registry);
    }
  };
};

export const getApplicationAttachmentHarness = (): ComponentType | null => getRegistry().harness;

export const subscribeApplicationAttachmentHarness = (onStoreChange: () => void): (() => void) => {
  const registry = getRegistry();
  registry.listeners.add(onStoreChange);

  return () => {
    registry.listeners.delete(onStoreChange);
  };
};
