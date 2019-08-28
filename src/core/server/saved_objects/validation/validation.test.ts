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

import { docValidator } from './index';

describe('docValidator', () => {
  test('does not run validators that have no application to the doc', () => {
    const validators = {
      foo: () => {
        throw new Error('Boom!');
      },
    };
    expect(() => docValidator(validators)({ type: 'shoo', bar: 'hi' })).not.toThrow();
  });

  test('validates the doc type', () => {
    const validators = {
      foo: () => {
        throw new Error('Boom!');
      },
    };
    expect(() => docValidator(validators)({ type: 'foo' })).toThrow(/Boom!/);
  });

  test('validates various props', () => {
    const validators = {
      a: jest.fn(),
      b: jest.fn(),
      c: jest.fn(),
    };
    docValidator(validators)({ type: 'a', b: 'foo' });

    expect(validators.c).not.toHaveBeenCalled();

    expect(validators.a.mock.calls).toEqual([[{ type: 'a', b: 'foo' }]]);
    expect(validators.b.mock.calls).toEqual([[{ type: 'a', b: 'foo' }]]);
  });
});
