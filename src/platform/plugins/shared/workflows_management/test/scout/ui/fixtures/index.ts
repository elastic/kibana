/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutTestFixtures, ScoutWorkerFixtures } from '@kbn/scout';
import { test as baseTest } from '@kbn/scout';

export interface WorkflowsManagementTestFixtures extends ScoutTestFixtures {
  // Add custom test-scoped fixtures here if needed
}

export interface WorkflowsManagementWorkerFixtures extends ScoutWorkerFixtures {
  // Add custom worker-scoped fixtures here if needed
}

export const test = baseTest.extend<
  WorkflowsManagementTestFixtures,
  WorkflowsManagementWorkerFixtures
>({
  // Extend with custom fixtures if needed
});

export { expect } from '@kbn/scout';

