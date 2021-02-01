/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/dev-utils';
import { getEnvOptions } from '@kbn/config/target/mocks';
import { startServers, stopServers } from './lib';
import { docExistsSuite } from './doc_exists';
import { docMissingSuite } from './doc_missing';
import { docMissingAndIndexReadOnlySuite } from './doc_missing_and_index_read_only';

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
const savedObjectIndex = `.kibana_${kibanaVersion}_001`;

describe('uiSettings/routes', function () {
  jest.setTimeout(10000);

  beforeAll(startServers);
  /* eslint-disable jest/valid-describe */
  describe('doc missing', docMissingSuite(savedObjectIndex));
  describe('doc missing and index readonly', docMissingAndIndexReadOnlySuite(savedObjectIndex));
  describe('doc exists', docExistsSuite(savedObjectIndex));
  /* eslint-enable jest/valid-describe */
  afterAll(stopServers);
});
