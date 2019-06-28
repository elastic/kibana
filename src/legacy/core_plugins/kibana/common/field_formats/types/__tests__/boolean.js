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

import expect from '@kbn/expect';
import { createBoolFormat } from '../boolean';
import { FieldFormat } from '../../../../../../ui/field_formats/field_format';

const BoolFormat = createBoolFormat(FieldFormat);

describe('Boolean Format', function () {

  let boolean;
  beforeEach(() => {
    boolean = new BoolFormat();
  });

  [
    {
      input: 0,
      expected: 'false'
    },
    {
      input: 'no',
      expected: 'false'
    },
    {
      input: false,
      expected: 'false'
    },
    {
      input: 'false',
      expected: 'false'
    },
    {
      input: 1,
      expected: 'true'
    },
    {
      input: 'yes',
      expected: 'true'
    },
    {
      input: true,
      expected: 'true'
    },
    {
      input: 'true',
      expected: 'true'
    },
    {
      input: ' True  ', //should handle trailing and mixed case
      expected: 'true'
    }
  ].forEach((test)=> {
    it(`convert ${test.input} to boolean`, ()=> {
      expect(boolean.convert(test.input)).to.be(test.expected);
    });
  });

  it('does not convert non-boolean values, instead returning original value', ()=> {
    const s = 'non-boolean value!!';
    expect(boolean.convert(s)).to.be(s);
  });

});
