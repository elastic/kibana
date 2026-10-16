/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiClientFixture } from '@kbn/scout';
import { expect } from '@kbn/scout/api';
import { authenticationStep, workflowYaml } from './service_account_suite';

const SERVICE_ACCOUNT_ENDPOINT = 'internal/security/service_account';

/** Headers for internal and versioned API requests, to add to a caller's credentials. */
export const HEADERS = {
  'kbn-xsrf': 'true',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
};

/** The path of the service account route for one account. */
export const accountPath = (id: string) => `${SERVICE_ACCOUNT_ENDPOINT}/${encodeURIComponent(id)}`;

/** The row the service account routes report for a workflow bound in `spaceId`. */
export const boundWorkflow = (spaceId: string, workflowId: string, workflowName: string) => ({
  pluginId: 'workflowsExecutionEngine',
  workloadType: 'workflow',
  workloadId: workflowId,
  displayName: workflowName,
  typeName: 'Workflow',
  href: `/s/${spaceId}/app/workflows/${workflowId}`,
});

/** Creates a space and a workflow in it that runs as the account, as the suite's admin. */
export const createBoundWorkflow = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  { spaceId, workflowId, workflowName, accountId }: Record<string, string>
): Promise<void> => {
  const space = await apiClient.post('api/spaces/space', {
    headers,
    body: { id: spaceId, name: spaceId },
    responseType: 'json',
  });
  expect(space, JSON.stringify(space.body)).toHaveStatusCode(200);

  const created = await apiClient.post(`s/${spaceId}/api/workflows/workflow`, {
    headers,
    body: {
      id: workflowId,
      yaml: workflowYaml(accountId, authenticationStep).replace(
        'name: CP2 identity proof',
        `name: ${workflowName}`
      ),
    },
    responseType: 'json',
  });
  expect(created, JSON.stringify(created.body)).toHaveStatusCode(200);
};

/**
 * Deletes the workflow and its space, whichever of them exist. The space goes even when deleting
 * the workflow fails, so a failed cleanup doesn't leave it on a shared server.
 */
export const deleteBoundWorkflow = async (
  apiClient: ApiClientFixture,
  headers: Record<string, string>,
  { spaceId, workflowId }: Record<string, string>
): Promise<void> => {
  try {
    const deletedWorkflow = await apiClient.delete(
      `s/${spaceId}/api/workflows/workflow/${workflowId}?force=true&acknowledgeAclLoss=true`,
      { headers, responseType: 'json' }
    );
    expect([200, 404]).toContain(deletedWorkflow.statusCode);
  } finally {
    const deletedSpace = await apiClient.delete(`api/spaces/space/${spaceId}`, { headers });
    expect([204, 404]).toContain(deletedSpace.statusCode);
  }
};
