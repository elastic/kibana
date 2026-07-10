/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import { coreWorkerFixtures } from './core_fixtures';
import { getEsClientForSystemIndices } from '../../../../common/services';

export const systemIndicesEsClientFixture = coreWorkerFixtures.extend<
  {},
  { systemIndicesEsClient: Client }
>({
  /**
   * Elasticsearch client that is allowed to read/write the restricted system indices
   * (e.g. the `.kibana*` saved object indices), which reject direct access from the
   * regular `elastic` superuser. On stateful deployments it authenticates as the
   * `system_indices_superuser` user provisioned by `@kbn/es` at cluster startup — the
   * same override FTR's `es` service applies; on serverless it is the default client.
   *
   * Use it to assert on raw saved object documents (e.g. `legacy-url-alias` docs or
   * `namespaces` fields) that Kibana's HTTP APIs do not expose. Prefer `esClient` for
   * everything else.
   */
  systemIndicesEsClient: [
    ({ config, log }, use) => {
      use(getEsClientForSystemIndices(config, log));
    },
    { scope: 'worker' },
  ],
});
