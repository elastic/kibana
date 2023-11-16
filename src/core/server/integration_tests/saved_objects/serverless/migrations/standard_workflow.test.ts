/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import { createTestServerlessInstances } from '@kbn/core-test-helpers-kbn-server';
import { createStandardWorkflowTest } from '../../migrations/shared_suites/zdt/standard_workflow';

describe('serverless - ZDT upgrades - standard workflow', () => {
  const startElasticsearch = async () => {
    const { startES } = createTestServerlessInstances({
      adjustTimeout: jest.setTimeout,
    });
    return await startES();
  };

  createStandardWorkflowTest({
    startES: startElasticsearch,
    logFilePath: Path.join(__dirname, 'standard_workflow.test.log'),
  });
});
