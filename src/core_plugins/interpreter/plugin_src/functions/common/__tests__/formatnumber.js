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
import { formatnumber } from '../formatnumber';
import { functionWrapper } from '@kbn/interpreter/test_utils';

describe('formatnumber', () => {
  const fn = functionWrapper(formatnumber);

  it('returns number as formatted string with given format', () => {
    expect(fn(140000, { format: '$0,0.00' })).to.be('$140,000.00');
  });

  describe('args', () => {
    describe('format', () => {
      it('sets the format of the resulting number string', () => {
        expect(fn(0.68, { format: '0.000%' })).to.be('68.000%');
      });

      it('casts number to a string if format is not specified', () => {
        expect(fn(140000.999999)).to.be('140000.999999');
      });
    });
  });
});
