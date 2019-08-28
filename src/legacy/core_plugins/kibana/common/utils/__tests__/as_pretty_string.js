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
import { asPrettyString } from '../as_pretty_string';

describe('asPrettyString', () => {

  it('Converts null and undefined values into a string signifying no value', () => {
    expect(asPrettyString(null)).to.equal(' - ');
    expect(asPrettyString(undefined)).to.equal(' - ');
  });

  it('Does not mutate string values', () => {
    const s = 'I am a string!@';
    expect(asPrettyString(s)).to.equal(s);
  });

  it('Converts objects values into presentable strings', () => {
    expect(asPrettyString({ key: 'value' })).to.equal('{\n  "key": "value"\n}');
  });

  it('Converts other non-string values into strings', () => {
    expect(asPrettyString(true)).to.equal('true');
    expect(asPrettyString(123)).to.equal('123');
  });

});
