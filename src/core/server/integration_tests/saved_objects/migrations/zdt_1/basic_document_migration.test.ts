/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import '../jest_matchers';
import { startElasticsearch } from '../kibana_migrator_test_kit';
import { createBasicDocumentsMigrationTest } from '../shared_suites/zdt/basic_document_migration';

describe('ZDT upgrades - basic document migration', () => {
  createBasicDocumentsMigrationTest({
    startES: startElasticsearch,
    logFilePath: Path.join(__dirname, 'basic_document_migration.test.log'),
  });
});
