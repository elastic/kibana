/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { randomUUID } from 'node:crypto';
import type { EsClient } from '@kbn/scout';

/** Removes unsaved execution documents created by this suite. */
export const deleteTestExecutions = async (
  esClient: EsClient,
  spaceId: string,
  executionIds: string[]
): Promise<void> => {
  if (executionIds.length === 0) return;
  const cleanupUser = `workflow-cleanup-${randomUUID()}`;
  const indices = ['.workflows-executions', '.workflows-step-executions'];
  await esClient.security.putRole({
    name: cleanupUser,
    indices: [
      {
        names: indices,
        privileges: ['read', 'delete', 'maintenance'],
        allow_restricted_indices: true,
      },
    ],
  });
  try {
    await esClient.security.putUser({
      username: cleanupUser,
      password: randomUUID(),
      roles: [cleanupUser],
    });
    const transportOptions = { headers: { 'es-security-runas-user': cleanupUser } };
    await esClient.indices.refresh({ index: indices }, transportOptions);
    const result = await esClient.deleteByQuery(
      {
        index: indices,
        refresh: true,
        query: {
          bool: {
            filter: [{ term: { spaceId } }],
            should: [{ ids: { values: executionIds } }, { terms: { workflowRunId: executionIds } }],
            minimum_should_match: 1,
          },
        },
      },
      transportOptions
    );
    if (result.timed_out || result.failures?.length) {
      throw new Error('Failed to remove test execution documents');
    }
  } finally {
    await esClient.security.deleteUser({ username: cleanupUser });
    await esClient.security.deleteRole({ name: cleanupUser });
  }
};
