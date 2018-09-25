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
import { rowCount } from '../row_count';
import { functionWrapper, emptyTable, testTable } from '@kbn/interpreter/test_utils';

describe('rowCount', () => {
  const fn = functionWrapper(rowCount);

  it('returns the number of rows in the datatable', () => {
    expect(fn(testTable)).to.equal(testTable.rows.length);
    expect(fn(emptyTable)).to.equal(0);
  });
});
