/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';

import { systemIndicesSuperuser, createEsClientForFtrConfig } from '@kbn/test';
import type { FtrProviderContext } from './ftr_provider_context';

export function EsProvider({ getService }: FtrProviderContext): Client {
  const config = getService('config');
  const isServerless = !!config.get('serverless');
  const log = getService('log');

  const lifecycle = getService('lifecycle');

  const client = createEsClientForFtrConfig(
    config,
    isServerless
      ? {}
      : {
          // Use system indices user so tests can write to system indices
          authOverride: systemIndicesSuperuser,
        }
  );

  const idxPatterns = ['.kibana*', '.internal*', 'logs*', 'metrics*', 'traces*'];

  lifecycle.beforeTests.add(async () => {
    client.indices.putIndexTemplate({
      name: 'refresh-1ms-default',
      index_patterns: idxPatterns,
      priority: 0,
      template: {
        settings: {
          index: {
            refresh_interval: '1ms',
          },
        },
      },
    });

    const { indices: internalIndices } = await client.indices.resolveIndex({
      name: idxPatterns,
      allow_no_indices: true,
    });

    await Promise.all(
      internalIndices.map(async ({ name: index }) => {
        const settings = (await client.indices.getSettings({ index }))[index].settings ?? {};

        if (settings.refresh_interval === '1ms') {
          return;
        }

        await client.indices
          .putSettings({
            index,
            settings: {
              refresh_interval: '1ms',
            },
          })
          .catch((error) => {
            log.warning(`Failed to set refresh_interval to 1ms for ${index}`);
          });
      })
    );
  });

  return client;
}
