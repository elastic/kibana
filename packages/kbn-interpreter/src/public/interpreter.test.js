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

import { FUNCTIONS_URL } from './consts';
import { initializeInterpreter } from './interpreter';

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
    const ajaxStream = jest.fn(async () => ({}));

    await initializeInterpreter({
      kfetch,
      ajaxStream,
      typesRegistry: { toJS: () => ({}) },
      functionsRegistry: { register: () => {} },
    });

    expect(kfetch).toHaveBeenCalledTimes(1);
    expect(kfetch).toHaveBeenCalledWith({ pathname: FUNCTIONS_URL });
  });

  it('registers client-side functions that pass through to the server', async () => {
    const kfetch = jest.fn(async () => {
      return {
        hello: { name: 'hello' },
        world: { name: 'world' },
      };
    });

    const register = jest.fn();
    const ajaxStream = jest.fn(async ({ onResponse }) => {
      onResponse({ id: 1, result: { hello: 'world' } });
    });

    await initializeInterpreter({
      kfetch,
      ajaxStream,
      typesRegistry: { toJS: () => ({}) },
      functionsRegistry: { register },
    });

    expect(register).toHaveBeenCalledTimes(2);

    const [hello, world] = register.mock.calls.map(([fn]) => fn());

    expect(hello.name).toEqual('hello');
    expect(typeof hello.fn).toEqual('function');
    expect(world.name).toEqual('world');
    expect(typeof world.fn).toEqual('function');

    const context = {};
    const args = { quote: 'All we have to decide is what to do with the time that is given us.' };

    const result = await hello.fn(context, args);

    expect(result).toEqual({ hello: 'world' });

    expect(ajaxStream).toHaveBeenCalledWith({
      url: FUNCTIONS_URL,
      onResponse: expect.any(Function),
      body: JSON.stringify({
        functions: [
          {
            functionName: 'hello',
            args,
            context,
            id: 1,
          },
        ],
      }),
    });
  });
});
