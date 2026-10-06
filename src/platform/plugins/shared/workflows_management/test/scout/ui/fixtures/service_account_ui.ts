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

/** Seeds historical execution identity in the protected index using a disposable fixture writer. */
export const seedHistoricalServiceAccountIdentity = async (
  esClient: EsClient,
  { index, executionId, accountId }: { index: string; executionId: string; accountId: string }
): Promise<void> => {
  const name = `scout-sa-history-${randomUUID()}`;
  const password = randomUUID();
  await esClient.security.putRole({
    name,
    indices: [{ names: [index], privileges: ['index'], allow_restricted_indices: true }],
  });
  try {
    await esClient.security.putUser({ username: name, password, roles: [name] });
    await esClient.update(
      {
        index,
        id: executionId,
        doc: { effectiveIdentity: { type: 'service_account', id: accountId } },
        refresh: 'wait_for',
      },
      {
        headers: {
          authorization: `Basic ${Buffer.from(`${name}:${password}`).toString('base64')}`,
        },
      }
    );
  } finally {
    await esClient.security.deleteUser({ username: name });
    await esClient.security.deleteRole({ name });
  }
};
