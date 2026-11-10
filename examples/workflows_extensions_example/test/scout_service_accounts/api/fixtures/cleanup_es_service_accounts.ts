/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import { SYSTEM_INDICES_SUPERUSER, SYSTEM_INDICES_SUPERUSER_PASSWORD } from '@kbn/es';
import type { ScoutTestConfig } from '@kbn/scout';
import { createEsClientForTesting } from '@kbn/test-es-server';

/** Removes this suite's ES accounts, tokens and encrypted credential fixtures. */
export const cleanupEsServiceAccounts = async (
  esClient: Client,
  config: ScoutTestConfig,
  accountIds: string[]
): Promise<void> => {
  const failures: Error[] = [];
  for (const id of accountIds) {
    try {
      await esClient.security.invalidateToken({ username: id, realm_name: '_service_account' });
      const credentials = await esClient.security.getServiceCredentials({
        namespace: 'kibana',
        service: id.slice('kibana/'.length),
      });
      for (const token of Object.keys(credentials.tokens)) {
        await esClient.transport.request({
          method: 'DELETE',
          path: `/_security/service/${id}/credential/token/${encodeURIComponent(token)}`,
        });
      }
      await esClient.transport.request({
        method: 'DELETE',
        path: `/_security/service/${id}`,
      });
    } catch (error) {
      failures.push(new Error(`Failed to remove service account ${id}`, { cause: error }));
    }
  }

  // The credential type is hidden and has no deletion route. Use Scout's system-index
  // account to remove only the encrypted credentials belonging to this suite.
  const systemClient = createEsClientForTesting({
    esUrl: config.hosts.elasticsearch,
    authOverride: {
      username: SYSTEM_INDICES_SUPERUSER,
      password: SYSTEM_INDICES_SUPERUSER_PASSWORD,
    },
    isCloud: config.isCloud,
  });
  try {
    if (accountIds.length > 0) {
      const result = await systemClient.deleteByQuery(
        {
          index: '.kibana',
          refresh: true,
          query: {
            bool: {
              filter: [
                { term: { type: 'service-account-credential' } },
                { terms: { 'service-account-credential.serviceAccountId': accountIds } },
              ],
            },
          },
        },
        { headers: { 'x-elastic-product-origin': 'kibana' } }
      );
      if (result.failures?.length) {
        throw new Error(JSON.stringify(result.failures));
      }
    }
  } catch (error) {
    failures.push(new Error('Failed to remove encrypted SA credentials', { cause: error }));
  } finally {
    await systemClient.close();
  }
  if (failures.length > 0) throw new AggregateError(failures, 'Service account cleanup failed');
};
