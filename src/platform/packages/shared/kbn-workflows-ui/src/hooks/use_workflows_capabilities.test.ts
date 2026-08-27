/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Capabilities } from '@kbn/core/public';
import { WORKFLOWS_MANAGEMENT_FEATURE_ID, WorkflowsManagementUiActions } from '@kbn/workflows';
import { getWorkflowsCapabilities } from './use_workflows_capabilities';

describe('getWorkflowsCapabilities', () => {
  it('extracts the managed workflow update capability', () => {
    const capabilities = {
      [WORKFLOWS_MANAGEMENT_FEATURE_ID]: {
        [WorkflowsManagementUiActions.updateManaged]: true,
      },
    } as unknown as Capabilities;

    expect(getWorkflowsCapabilities(capabilities).canUpdateManagedWorkflow).toBe(true);
  });
});
