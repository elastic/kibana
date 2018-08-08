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
import { isTermSizeZeroError } from '../is_term_size_zero_error';

describe('isTermSizeZeroError', () => {
  const identifyingString = 'size must be positive, got 0';

  it('returns true if it contains the identifying string', () => {
    const error = {
      resp: {
        error: {
          root_cause: [{
            reason: `Some crazy Java exception: ${identifyingString}`,
          }],
        }
      }
    };
    expect(isTermSizeZeroError(error)).to.be(true);
  });

  it(`returns false if it doesn't contain the identifying string`, () => {
    const error = {
      resp: {
        error: {
          root_cause: [{
            reason: `Some crazy Java exception`,
          }],
        }
      }
    };
    expect(isTermSizeZeroError(error)).to.be(false);
  });

  it ('returns false for non-elasticsearch error input', () => {
    expect(isTermSizeZeroError({ foo: 'bar' })).to.be(false);
  });
});
