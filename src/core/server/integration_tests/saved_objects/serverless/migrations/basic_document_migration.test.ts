/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { createTestServerlessInstances } from '@kbn/core-test-helpers-kbn-server';
import { createBasicDocumentsMigrationTest } from '../../migrations/shared_suites/zdt/basic_document_migration';

describe('serverless - ZDT upgrades - basic document migration', () => {
  const startElasticsearch = async () => {
    const { startES } = createTestServerlessInstances({
      adjustTimeout: jest.setTimeout,
    });
    return await startES();
  };

  createBasicDocumentsMigrationTest({
    startES: startElasticsearch,
    logFilePath: Path.join(__dirname, 'basic_document_migration.test.log'),
  });
});
