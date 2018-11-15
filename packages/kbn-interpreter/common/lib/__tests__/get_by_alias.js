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
import { getByAlias } from '../get_by_alias';

describe('getByAlias', () => {
  const fnsObject = {
    foo: { name: 'foo', aliases: ['f'] },
    bar: { name: 'bar', aliases: ['b'] },
  };

  const fnsArray = [{ name: 'foo', aliases: ['f'] }, { name: 'bar', aliases: ['b'] }];

  it('returns the function by name', () => {
    expect(getByAlias(fnsObject, 'foo')).to.be(fnsObject.foo);
    expect(getByAlias(fnsObject, 'bar')).to.be(fnsObject.bar);
    expect(getByAlias(fnsArray, 'foo')).to.be(fnsArray[0]);
    expect(getByAlias(fnsArray, 'bar')).to.be(fnsArray[1]);
  });

  it('returns the function by alias', () => {
    expect(getByAlias(fnsObject, 'f')).to.be(fnsObject.foo);
    expect(getByAlias(fnsObject, 'b')).to.be(fnsObject.bar);
    expect(getByAlias(fnsArray, 'f')).to.be(fnsArray[0]);
    expect(getByAlias(fnsArray, 'b')).to.be(fnsArray[1]);
  });

  it('returns the function by case-insensitive name', () => {
    expect(getByAlias(fnsObject, 'FOO')).to.be(fnsObject.foo);
    expect(getByAlias(fnsObject, 'BAR')).to.be(fnsObject.bar);
    expect(getByAlias(fnsArray, 'FOO')).to.be(fnsArray[0]);
    expect(getByAlias(fnsArray, 'BAR')).to.be(fnsArray[1]);
  });

  it('returns the function by case-insensitive alias', () => {
    expect(getByAlias(fnsObject, 'F')).to.be(fnsObject.foo);
    expect(getByAlias(fnsObject, 'B')).to.be(fnsObject.bar);
    expect(getByAlias(fnsArray, 'F')).to.be(fnsArray[0]);
    expect(getByAlias(fnsArray, 'B')).to.be(fnsArray[1]);
  });

  it('handles empty strings', () => {
    const emptyStringFnsObject = { '': { name: '' } };
    const emptyStringAliasFnsObject = { foo: { name: 'foo', aliases: [''] } };
    expect(getByAlias(emptyStringFnsObject, '')).to.be(emptyStringFnsObject['']);
    expect(getByAlias(emptyStringAliasFnsObject, '')).to.be(emptyStringAliasFnsObject.foo);

    const emptyStringFnsArray = [{ name: '' }];
    const emptyStringAliasFnsArray = [{ name: 'foo', aliases: [''] }];
    expect(getByAlias(emptyStringFnsArray, '')).to.be(emptyStringFnsArray[0]);
    expect(getByAlias(emptyStringAliasFnsArray, '')).to.be(emptyStringAliasFnsArray[0]);
  });

  it('handles "undefined" strings', () => {
    const undefinedFnsObject = { undefined: { name: 'undefined' } };
    const undefinedAliasFnsObject = { foo: { name: 'undefined', aliases: ['undefined'] } };
    expect(getByAlias(undefinedFnsObject, 'undefined')).to.be(undefinedFnsObject.undefined);
    expect(getByAlias(undefinedAliasFnsObject, 'undefined')).to.be(undefinedAliasFnsObject.foo);

    const emptyStringFnsArray = [{ name: 'undefined' }];
    const emptyStringAliasFnsArray = [{ name: 'foo', aliases: ['undefined'] }];
    expect(getByAlias(emptyStringFnsArray, 'undefined')).to.be(emptyStringFnsArray[0]);
    expect(getByAlias(emptyStringAliasFnsArray, 'undefined')).to.be(emptyStringAliasFnsArray[0]);
  });

  it('returns undefined if not found', () => {
    expect(getByAlias(fnsObject, 'baz')).to.be(undefined);
    expect(getByAlias(fnsArray, 'baz')).to.be(undefined);
  });
});
