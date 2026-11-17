/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicStepRegistry } from './step_registry';

/**
 * Read-only view of the public registries, exposed on `window` so Scout UI tests can
 * verify that every step registered on the server is also registered on the client.
 */
export interface WorkflowsExtensionsTestBridge {
  getStepDefinitionIds: () => Promise<string[]>;
}

declare global {
  interface Window {
    __workflowsExtensionsTestBridge?: WorkflowsExtensionsTestBridge;
  }
}

/** Installs the test bridge on `window` and returns a function that removes it. */
export const installTestBridge = (stepRegistry: PublicStepRegistry): (() => void) => {
  window.__workflowsExtensionsTestBridge = {
    getStepDefinitionIds: async () => {
      await stepRegistry.whenReady();
      return stepRegistry.getAll().map(({ id }) => id);
    },
  };

  return () => {
    delete window.__workflowsExtensionsTestBridge;
  };
};
