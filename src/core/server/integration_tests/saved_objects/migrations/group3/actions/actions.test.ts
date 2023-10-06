/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { MIGRATION_CLIENT_OPTIONS } from '@kbn/core-saved-objects-migration-server-internal';
import { runActionTestSuite } from './actions_test_suite';

const { startES } = createTestServers({
  adjustTimeout: (t: number) => jest.setTimeout(t),
  settings: {
    es: {
      license: 'basic',
      esArgs: ['http.max_content_length=10Kb'],
    },
  },
});

describe('migration actions', () => {
  runActionTestSuite({
    startEs: async () => {
      const esServer = await startES();
      const client = esServer.es.getClient().child(MIGRATION_CLIENT_OPTIONS);
      return { esServer, client };
    },
    environment: 'traditional',
  });
});
