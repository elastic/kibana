/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import '../jest_matchers';
import { startElasticsearch } from '../kibana_migrator_test_kit';
import { createStandardWorkflowTest } from '../shared_suites/zdt/standard_workflow';

describe('ZDT upgrades - standard workflow', () => {
  createStandardWorkflowTest({
    startES: startElasticsearch,
    logFilePath: Path.join(__dirname, 'standard_workflow.test.log'),
  });
});
