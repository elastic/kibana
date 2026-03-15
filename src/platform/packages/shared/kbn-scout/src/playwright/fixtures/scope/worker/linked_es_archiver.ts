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

export interface LinkedProjectFixture {
  esClient: Client;
  esArchiver: EsArchiverFixture;
}

export const linkedEsFixtures = coreWorkerFixtures.extend<
  {},
  { linkedProject: LinkedProjectFixture }
>({
  /**
   * Provides ES client and esArchiver for the linked CPS project.
   * Usage in tests: `linkedProject.esArchiver.loadIfNeeded(...)` or `linkedProject.esClient`.
   */
  linkedProject: [
    ({ config, log }, use) => {
      if (!config.serverless || !config.linkedProject) {
        throw new Error(
          'linkedProject fixture is only available in serverless mode with CPS enabled. ' +
            'Use --serverConfigSet cps_local to start servers with a linked cluster.'
        );
      }

      const esClient = getLinkedEsClient(config, log);
      const archiver = getLinkedEsArchiver(esClient, log);
      const loadIfNeeded = async (name: string, performance?: LoadActionPerfOptions | undefined) =>
        archiver.loadIfNeeded(name, performance);

      use({
        esClient,
        esArchiver: { loadIfNeeded },
      });
    },
    { scope: 'worker' },
  ],
});
