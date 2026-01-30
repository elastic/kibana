/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared dependencies container entry point
 *
 * This file serves as the entry for the kbn-shared MF container.
 * All shared dependencies are exposed via Module Federation's exposes config,
 * not imported here directly.
 *
 * The actual module loading is handled by MF's container runtime.
 */

// Mark the shared container as ready
declare global {
  interface Window {
    __kbnSharedReady?: boolean;
    __kbnSharedVersion?: string;
  }
}

// Version for compatibility checking
const SHARED_VERSION = '1.0.0';

// Initialize
if (typeof window !== 'undefined') {
  window.__kbnSharedReady = true;
  window.__kbnSharedVersion = SHARED_VERSION;
}

// Export version for programmatic access
export const version = SHARED_VERSION;

// Export a ready check function
export function isReady(): boolean {
  return typeof window !== 'undefined' && window.__kbnSharedReady === true;
}
