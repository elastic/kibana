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
import { shortenDottedString } from '../shorten_dotted_string';

describe('shortenDottedString', () => {

  it('Convert a dot.notated.string into a short string', () => {
    expect(shortenDottedString('dot.notated.string')).to.equal('d.n.string');
  });

  it('Ignores non-string values', () => {
    expect(shortenDottedString(true)).to.equal(true);
    expect(shortenDottedString(123)).to.equal(123);
    const obj = { key: 'val' };
    expect(shortenDottedString(obj)).to.equal(obj);
  });

});
