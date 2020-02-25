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

jest.mock('repl', () => ({ start: opts => ({ opts, context: {} }) }), { virtual: true });

describe('repl', () => {
  const originalConsoleLog = console.log;
  let mockRepl;

  beforeEach(() => {
    global.console.log = jest.fn();
    require('repl').start = opts => {
      let resetHandler;
      const replServer = {
        opts,
        context: {},
        on: jest.fn((eventName, handler) => {
          expect(eventName).toBe('reset');
          resetHandler = handler;
        }),
      };

      mockRepl = {
        replServer,
        clear() {
          replServer.context = {};
          resetHandler(replServer.context);
        },
      };
      return replServer;
    };
  });

  afterEach(() => {
    global.console.log = originalConsoleLog;
  });

  test('it exposes the server object', () => {
    const { startRepl } = require('.');
    const testServer = {
      server: {},
    };
    const replServer = startRepl(testServer);
    expect(replServer.context.server).toBe(testServer.server);
    expect(replServer.context.kbnServer).toBe(testServer);
  });

  test('it prompts with Kibana>', () => {
    const { startRepl } = require('.');
    expect(startRepl({}).opts.prompt).toBe('Kibana> ');
  });

  test('it colorizes raw values', () => {
    const { startRepl } = require('.');
    const replServer = startRepl({});
    expect(replServer.opts.writer({ meaning: 42 })).toMatchSnapshot();
  });

  test('it handles undefined', () => {
    const { startRepl } = require('.');
    const replServer = startRepl({});
    expect(replServer.opts.writer()).toMatchSnapshot();
  });

  test('it handles deep and recursive objects', () => {
    const { startRepl } = require('.');
    const replServer = startRepl({});
    const splosion = {};
    let child = splosion;
    for (let i = 0; i < 2000; ++i) {
      child[i] = {};
      child = child[i];
    }
    splosion.whoops = splosion;
    expect(replServer.opts.writer(splosion)).toMatchSnapshot();
  });

  test('it allows print depth to be specified', () => {
    const { startRepl } = require('.');
    const replServer = startRepl({});
    const splosion = {};
    let child = splosion;
    for (let i = 0; i < 2000; ++i) {
      child[i] = {};
      child = child[i];
    }
    splosion.whoops = splosion;
    replServer.context.repl.printDepth = 2;
    expect(replServer.opts.writer(splosion)).toMatchSnapshot();
  });

  test('resets context to original when reset', () => {
    const { startRepl } = require('.');
    const testServer = {
      server: {},
    };
    const replServer = startRepl(testServer);
    replServer.context.foo = 'bar';
    expect(replServer.context.server).toBe(testServer.server);
    expect(replServer.context.kbnServer).toBe(testServer);
    expect(replServer.context.foo).toBe('bar');
    mockRepl.clear();
    expect(replServer.context.server).toBe(testServer.server);
    expect(replServer.context.kbnServer).toBe(testServer);
    expect(replServer.context.foo).toBeUndefined();
  });

  test('it prints promise resolves', async () => {
    const { startRepl } = require('.');
    const replServer = startRepl({});
    const calls = await waitForPrompt(replServer, () =>
      replServer.opts.writer(Promise.resolve([1, 2, 3]))
    );
    expect(calls).toMatchSnapshot();
  });

  test('it prints promise rejects', async () => {
    const { startRepl } = require('.');
    const replServer = startRepl({});
    const calls = await waitForPrompt(replServer, () =>
      replServer.opts.writer(Promise.reject('Dang, diggity!'))
    );
    expect(calls).toMatchSnapshot();
  });

  test('promises resolves only write to a specific depth', async () => {
    const { startRepl } = require('.');
    const replServer = startRepl({});
    const splosion = {};
    let child = splosion;
    for (let i = 0; i < 2000; ++i) {
      child[i] = {};
      child = child[i];
    }
    splosion.whoops = splosion;
    const calls = await waitForPrompt(replServer, () =>
      replServer.opts.writer(Promise.resolve(splosion))
    );
    expect(calls).toMatchSnapshot();
  });

  test('promises rejects only write to a specific depth', async () => {
    const { startRepl } = require('.');
    const replServer = startRepl({});
    const splosion = {};
    let child = splosion;
    for (let i = 0; i < 2000; ++i) {
      child[i] = {};
      child = child[i];
    }
    splosion.whoops = splosion;
    const calls = await waitForPrompt(replServer, () =>
      replServer.opts.writer(Promise.reject(splosion))
    );
    expect(calls).toMatchSnapshot();
  });

  test('repl exposes a print object that lets you tailor depth', () => {
    const { startRepl } = require('.');
    const replServer = startRepl({});
    replServer.context.repl.print({ hello: { world: { nstuff: 'yo' } } }, 1);
    expect(global.console.log.mock.calls).toMatchSnapshot();
  });

  test('repl exposes a print object that prints promises', async () => {
    const { startRepl } = require('.');
    const replServer = startRepl({});
    const promise = Promise.resolve({ hello: { world: { nstuff: 'yo' } } });
    const calls = await waitForPrompt(replServer, () => replServer.context.repl.print(promise, 1));
    expect(calls).toMatchSnapshot();
  });

  async function waitForPrompt(replServer, fn) {
    let resolveDone;
    const done = new Promise(resolve => (resolveDone = resolve));
    replServer.displayPrompt = () => {
      resolveDone();
    };
    fn();
    await done;
    return global.console.log.mock.calls;
  }
});
