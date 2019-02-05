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

import { initializeInterpreter, FUNCTIONS_URL } from './interpreter';

jest.mock('../common/interpreter/interpret', () => ({
  interpreterProvider: () => () => ({}),
}));

jest.mock('../common/lib/serialize', () => ({
  serializeProvider: () => ({ serialize: () => ({}) }),
}));

jest.mock('./create_handlers', () => ({
  createHandlers: () => ({}),
}));

describe('kbn-interpreter/interpreter', () => {
  it('loads server-side functions', async () => {
    const kfetch = jest.fn(async () => ({}));

    await initializeInterpreter(kfetch, { toJS: () => ({}) }, ({ register: () => {} }));

    expect(kfetch).toHaveBeenCalledTimes(1);
    expect(kfetch).toHaveBeenCalledWith({ pathname: FUNCTIONS_URL });
  });

  it('registers client-side functions that pass through to the server', async () => {
    const kfetch = jest.fn(async () => ({
      hello: { name: 'hello' },
      world: { name: 'world' },
    }));

    const register = jest.fn();

    await initializeInterpreter(kfetch, { toJS: () => ({}) }, ({ register }));

    expect(register).toHaveBeenCalledTimes(2);

    const [ hello, world ] = register.mock.calls.map(([fn]) => fn());

    expect(hello.name).toEqual('hello');
    expect(typeof hello.fn).toEqual('function');
    expect(world.name).toEqual('world');
    expect(typeof world.fn).toEqual('function');

    const context = {};
    const args = { quote: 'All we have to decide is what to do with the time that is given us.' };

    await hello.fn(context, args);

    expect(kfetch).toHaveBeenCalledWith({
      pathname: `${FUNCTIONS_URL}/hello`,
      method: 'POST',
      body: JSON.stringify({ args, context }),
    });
  });

});
