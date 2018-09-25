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
  const fns = {
    foo: { aliases: ['f'] },
    bar: { aliases: ['b'] },
  };

  it('returns the function by name', () => {
    expect(getByAlias(fns, 'foo')).to.be(fns.foo);
    expect(getByAlias(fns, 'bar')).to.be(fns.bar);
  });

  it('returns the function by alias', () => {
    expect(getByAlias(fns, 'f')).to.be(fns.foo);
    expect(getByAlias(fns, 'b')).to.be(fns.bar);
  });

  it('returns the function by case-insensitive name', () => {
    expect(getByAlias(fns, 'FOO')).to.be(fns.foo);
    expect(getByAlias(fns, 'BAR')).to.be(fns.bar);
  });

  it('returns the function by case-insensitive alias', () => {
    expect(getByAlias(fns, 'F')).to.be(fns.foo);
    expect(getByAlias(fns, 'B')).to.be(fns.bar);
  });

  it('handles empty strings', () => {
    const emptyStringFns = { '': {} };
    const emptyStringAliasFns = { foo: { aliases: [''] } };
    expect(getByAlias(emptyStringFns, '')).to.be(emptyStringFns['']);
    expect(getByAlias(emptyStringAliasFns, '')).to.be(emptyStringAliasFns.foo);
  });

  it('handles "undefined" strings', () => {
    const emptyStringFns = { undefined: {} };
    const emptyStringAliasFns = { foo: { aliases: ['undefined'] } };
    expect(getByAlias(emptyStringFns, 'undefined')).to.be(emptyStringFns.undefined);
    expect(getByAlias(emptyStringAliasFns, 'undefined')).to.be(emptyStringAliasFns.foo);
  });

  it('returns undefined if not found', () => {
    expect(getByAlias(fns, 'baz')).to.be(undefined);
  });
});
