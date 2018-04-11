jest.mock('repl', () => ({ start: (opts) => ({ opts, context: {} }) }), { virtual: true });

describe('repl', () => {
  const originalConsoleLog = console.log;

  beforeEach(() => {
    global.console.log = jest.fn();
    require('repl').start = (opts) => {
      return {
        opts,
        context: { },
      };
    };
  });

  afterEach(() => {
    global.console.log = originalConsoleLog;
  });

  test('it exposes the server object', () => {
    const { startRepl } = require('./repl');
    const testServer = {};
    const replServer = startRepl(testServer);
    expect(replServer.context.server).toBe(testServer);
  });

  test('it prompts with Kibana>', () => {
    const { startRepl } = require('./repl');
    expect(startRepl({}).opts.prompt).toBe('Kibana> ');
  });

  test('it colorizes raw values', () => {
    const { startRepl } = require('./repl');
    const replServer = startRepl({});
    expect(replServer.opts.writer({ meaning: 42 }))
      .toMatchSnapshot();
  });

  test('it handles undefined', () => {
    const { startRepl } = require('./repl');
    const replServer = startRepl({});
    expect(replServer.opts.writer())
      .toMatchSnapshot();
  });

  test('it handles deep and recursive objects', () => {
    const { startRepl } = require('./repl');
    const replServer = startRepl({});
    const splosion = {};
    let child = splosion;
    for (let i = 0; i < 2000; ++i) {
      child[i] = {};
      child = child[i];
    }
    splosion.whoops = splosion;
    expect(replServer.opts.writer(splosion))
      .toMatchSnapshot();
  });

  test('it prints promise resolves', async () => {
    const { startRepl } = require('./repl');
    const replServer = startRepl({});
    const calls = await waitForPrompt(
      replServer,
      () => replServer.opts.writer(Promise.resolve([1, 2, 3])),
    );
    expect(calls)
      .toMatchSnapshot();
  });

  test('it prints promise rejects', async () => {
    const { startRepl } = require('./repl');
    const replServer = startRepl({});
    const calls = await waitForPrompt(
      replServer,
      () => replServer.opts.writer(Promise.reject('Dang, diggity!')),
    );
    expect(calls)
      .toMatchSnapshot();
  });

  test('promises resolves only write to a specific depth', async () => {
    const { startRepl } = require('./repl');
    const replServer = startRepl({});
    const splosion = {};
    let child = splosion;
    for (let i = 0; i < 2000; ++i) {
      child[i] = {};
      child = child[i];
    }
    splosion.whoops = splosion;
    const calls = await waitForPrompt(
      replServer,
      () => replServer.opts.writer(Promise.resolve(splosion)),
    );
    expect(calls)
      .toMatchSnapshot();
  });

  test('promises rejects only write to a specific depth', async () => {
    const { startRepl } = require('./repl');
    const replServer = startRepl({});
    const splosion = {};
    let child = splosion;
    for (let i = 0; i < 2000; ++i) {
      child[i] = {};
      child = child[i];
    }
    splosion.whoops = splosion;
    const calls = await waitForPrompt(
      replServer,
      () => replServer.opts.writer(Promise.reject(splosion)),
    );
    expect(calls)
      .toMatchSnapshot();
  });

  test('repl exposes a print object that lets you tailor depth', () => {
    const { startRepl } = require('./repl');
    const replServer = startRepl({});
    replServer.context.repl.print({ hello: { world: { nstuff: 'yo' } } }, 1);
    expect(global.console.log.mock.calls)
      .toMatchSnapshot();
  });

  test('repl exposes a print object that prints promises', async () => {
    const { startRepl } = require('./repl');
    const replServer = startRepl({});
    const promise = Promise.resolve({ hello: { world: { nstuff: 'yo' } } });
    const calls = await waitForPrompt(
      replServer,
      () => replServer.context.repl.print(promise, 1),
    );
    expect(calls)
      .toMatchSnapshot();
  });

  async function waitForPrompt(replServer, fn) {
    let resolveDone;
    const done = new Promise((resolve) => resolveDone = resolve);
    replServer.displayPrompt = () => {
      resolveDone();
    };
    fn();
    await done;
    return global.console.log.mock.calls;
  }
});
