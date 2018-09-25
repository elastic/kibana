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
import { exactly } from '../exactly';
import { functionWrapper } from '../../../../../../packages/kbn-interpreter/common/__tests__/helpers/function_wrapper';
import { emptyFilter } from '../../../../../../x-pack/plugins/canvas/canvas_plugin_src/functions/common/__tests__/fixtures/test_filters';

describe('exactly', () => {
  const fn = functionWrapper(exactly);

  it('returns a filter', () => {
    const args = { column: 'name', value: 'product2' };
    expect(fn(emptyFilter, args)).to.have.property('type', 'filter');
  });

  it("adds an exactly object to 'and'", () => {
    const result = fn(emptyFilter, { column: 'name', value: 'product2' });
    expect(result.and[0]).to.have.property('type', 'exactly');
  });

  describe('args', () => {
    describe('column', () => {
      it('sets the column to apply the filter to', () => {
        const result = fn(emptyFilter, { column: 'name' });
        expect(result.and[0]).to.have.property('column', 'name');
      });
    });

    describe('value', () => {
      it('sets the exact value to filter on in a column', () => {
        const result = fn(emptyFilter, { value: 'product2' });
        expect(result.and[0]).to.have.property('value', 'product2');
      });
    });
  });
});
