/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { startServers, stopServers } from './lib';

import { docExistsSuite } from './doc_exists';
import { docMissingSuite } from './doc_missing';
import { docMissingAndIndexReadOnlySuite } from './doc_missing_and_index_read_only';

describe('uiSettings/routes', function () {
  jest.setTimeout(10000);

  beforeAll(startServers);
  /* eslint-disable jest/valid-describe */
  describe('doc missing', docMissingSuite);
  describe('doc missing and index readonly', docMissingAndIndexReadOnlySuite);
  describe('doc exists', docExistsSuite);
  /* eslint-enable jest/valid-describe */
  afterAll(stopServers);
});
