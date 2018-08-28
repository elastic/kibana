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
import { ElasticsearchError } from '../elasticsearch_error';

describe('ElasticsearchError', () => {
  function createError(rootCauses = []) {
    // Elasticsearch errors are characterized by the resp.error.root_cause array.
    return {
      resp: {
        error: {
          root_cause: rootCauses.map(rootCause => ({
            reason: rootCause,
          })),
        }
      }
    };
  }

  describe('interface', () => {
    describe('constructor', () => {
      it('throws an error if instantiated with a non-elasticsearch error', () => {
        expect(() => new ElasticsearchError({})).to.throwError();
      });
    });

    describe('getRootCauses', () => {
      it(`returns the root_cause array's reason values`, () => {
        const rootCauses = ['a', 'b'];
        const error = createError(rootCauses);
        const esError = new ElasticsearchError(error);
        expect(esError.getRootCauses()).to.eql(rootCauses);
      });
    });

    describe('hasRootCause', () => {
      it(`returns true if the cause occurs in the root_cause array's reasons, insensitive to case`, () => {
        const rootCauses = ['a very detailed error', 'a slightly more detailed error'];
        const error = createError(rootCauses);
        const esError = new ElasticsearchError(error);
        expect(esError.hasRootCause('slightly MORE')).to.be(true);
      });

      it(`returns false if the cause doesn't occur in the root_cause array's reasons`, () => {
        const rootCauses = ['a very detailed error', 'a slightly more detailed error'];
        const error = createError(rootCauses);
        const esError = new ElasticsearchError(error);
        expect(esError.hasRootCause('nonexistent error')).to.be(false);
      });
    });
  });
});
