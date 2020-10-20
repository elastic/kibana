/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
