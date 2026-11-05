/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createTestServerlessInstances } from '@kbn/core-test-helpers-kbn-server';
import { runActionTestSuite } from '../../migrations/group3/actions/actions_test_suite';

const { startES } = createTestServerlessInstances({
  adjustTimeout: jest.setTimeout,
});

describe('Migration actions - serverless environment', () => {
  runActionTestSuite({
    startEs: async () => {
      const serverlessEs = await startES();
      const client = serverlessEs.getClient();
      return {
        esServer: serverlessEs,
        client,
      };
    },
    environment: 'serverless',
  });
});
