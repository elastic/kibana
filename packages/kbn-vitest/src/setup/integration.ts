/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { beforeAll, afterAll } from 'vitest';

/**
 * Integration test specific setup.
 * This runs for integration tests that may need real service connections.
 */

// Increase default timeout for integration tests
beforeAll(() => {
  // Integration tests may need more time for setup
  // The timeout is also set in the preset, but this ensures it's applied
});

afterAll(() => {
  // Cleanup any lingering resources
  // This is important for integration tests that may connect to real services
});

// Log test environment info for debugging
if (process.env.CI) {
  // eslint-disable-next-line no-console
  console.log('[Integration Test Setup]', {
    nodeVersion: process.version,
    platform: process.platform,
    ci: process.env.CI,
  });
}

export {};
