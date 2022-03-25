/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Env } from '@kbn/config';
import { REPO_ROOT } from '@kbn/utils';
import { getEnvOptions } from '../../config/mocks';
import { startServers, stopServers } from './lib';
import { docExistsSuite } from './doc_exists';
import { docMissingSuite } from './doc_missing';

const kibanaVersion = Env.createDefault(REPO_ROOT, getEnvOptions()).packageInfo.version;
const savedObjectIndex = `.kibana_${kibanaVersion}_001`;

describe('uiSettings/routes', function () {
  jest.setTimeout(120_000);

  beforeAll(startServers);
  // eslint-disable-next-line jest/valid-describe
  describe('doc missing', docMissingSuite(savedObjectIndex));
  // eslint-disable-next-line jest/valid-describe
  describe('doc exists', docExistsSuite(savedObjectIndex));
  afterAll(stopServers);
});
