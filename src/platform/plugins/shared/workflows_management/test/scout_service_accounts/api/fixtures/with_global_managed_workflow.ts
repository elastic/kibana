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
import { workflowSystemIndex } from '../../../../server/storage/indices';

/** Temporarily installs a managed test definition globally without creating an SA binding. */
export const withGlobalManagedWorkflow = async (
  esClient: EsClient,
  workflowId: string,
  run: () => Promise<void>
): Promise<void> => {
  const name = `scout-global-workflow-${randomUUID()}`;
  const index = workflowSystemIndex('workflows');
  await esClient.security.putRole({
    name,
    indices: [{ names: [index], privileges: ['read', 'index'], allow_restricted_indices: true }],
  });
  try {
    await esClient.security.putUser({ username: name, password: randomUUID(), roles: [name] });
    const transport = { headers: { 'es-security-runas-user': name } };
    const document = { index, id: workflowId };
    const { _source: source } = await esClient.get<{ spaceId: string; managed: boolean }>(
      document,
      transport
    );
    if (!source?.managed || !source.spaceId) throw new Error('Expected a managed test workflow');
    await esClient.update({ ...document, doc: { spaceId: '*' }, refresh: 'wait_for' }, transport);
    try {
      await run();
    } finally {
      await esClient.update(
        { ...document, doc: { spaceId: source.spaceId }, refresh: 'wait_for' },
        transport
      );
    }
  } finally {
    await esClient.security.deleteUser({ username: name });
    await esClient.security.deleteRole({ name });
  }
};
