/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { LoadActionPerfOptions } from '@kbn/es-archiver';
import { coreWorkerFixtures } from './core_fixtures';
import { getLinkedEsClient, getLinkedEsArchiver } from '../../../../common/services';
import type { EsArchiverFixture } from './es_archiver';

export interface LinkedEsFixtures {
  linkedEsClient: Client;
  linkedEsArchiver: EsArchiverFixture;
}

export const linkedEsFixtures = coreWorkerFixtures.extend<{}, LinkedEsFixtures>({
  linkedEsClient: [
    ({ config, log }, use) => {
      use(getLinkedEsClient(config, log));
    },
    { scope: 'worker' },
  ],

  linkedEsArchiver: [
    ({ log, linkedEsClient, kbnClient }, use) => {
      const archiver = getLinkedEsArchiver(linkedEsClient, kbnClient, log);
      const loadIfNeeded = async (name: string, performance?: LoadActionPerfOptions | undefined) =>
        archiver!.loadIfNeeded(name, performance);

      use({ loadIfNeeded });
    },
    { scope: 'worker' },
  ],
});
