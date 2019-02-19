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

import expect from 'expect.js';
import { isEsErrorFactory } from '../is_es_error_factory';
import { set } from 'lodash';

class MockAbstractEsError {}

describe('is_es_error_factory', () => {

  let mockServer;
  let isEsError;

  beforeEach(() => {
    const mockEsErrors = {
      _Abstract: MockAbstractEsError
    };
    mockServer = {};
    set(mockServer, 'plugins.elasticsearch.getCluster', () => ({ errors: mockEsErrors }));

    isEsError = isEsErrorFactory(mockServer);
  });

  describe('#isEsErrorFactory', () => {

    it('should return a function', () => {
      expect(isEsError).to.be.a(Function);
    });

    describe('returned function', () => {

      it('should return true if passed-in err is a known esError', () => {
        const knownEsError = new MockAbstractEsError();
        expect(isEsError(knownEsError)).to.be(true);
      });

      it('should return false if passed-in err is not a known esError', () => {
        const unknownEsError = {};
        expect(isEsError(unknownEsError)).to.be(false);

      });
    });
  });
});
