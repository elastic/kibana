/*eslint-env jest*/

const createCommanderAction = require('./commander_action');
const run = require('./run');

jest.mock('./run', () => jest.fn());

const STACK_TRACE_RE = /\n(?:\s+at .+(?:\n|$))+/g;
expect.addSnapshotSerializer({
  print(val, serialize) {
    return serialize(val.replace(STACK_TRACE_RE, '\n  ...stack trace...\n'));
  },

  test(val) {
    return typeof val === 'string' && STACK_TRACE_RE.test(val);
  },
});

beforeAll(() => {
  jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
  jest.spyOn(process, 'exit').mockImplementation(() => {});
});

beforeEach(() => {
  run.mockReset();
  jest.clearAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('commander action', () => {
  it('creates a function', async () => {
    expect(typeof createCommanderAction()).toBe('function');
  });

  it('passes args to getOptions, calls run() with taskName and options', async () => {
    const action = createCommanderAction('taskName', (...args) => ({ args }));
    await action('a', 'b', 'c', 'd', 'e', 'f');
    expect(run).toHaveBeenCalledTimes(1);
    expect(run.mock.calls).toMatchSnapshot();
  });

  it('exits with status 1 when task throws synchronously', async () => {
    run.mockImplementation(() => {
      throw new Error('sync error thrown');
    });

    await createCommanderAction('mockTask')();

    expect(process.stderr.write).toHaveBeenCalledTimes(1);
    expect(process.stderr.write.mock.calls).toMatchSnapshot();
    expect(process.exit).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('exits with status 1 when task throws error asynchronously', async () => {
    run.mockImplementation(async () => {
      throw new Error('async error thrown');
    });

    await createCommanderAction('mockTask')();

    expect(process.stderr.write).toHaveBeenCalledTimes(1);
    expect(process.stderr.write.mock.calls).toMatchSnapshot();
    expect(process.exit).toHaveBeenCalledTimes(1);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
