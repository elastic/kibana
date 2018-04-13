/*eslint-env jest*/

jest.mock('./plugin_config', () => () => (
  { id: 'testPlugin' }
));

jest.mock('./tasks', () => {
  return { testTask: jest.fn() };
});

const run = require('./run');

describe('lib/run', () => {
  beforeEach(() => jest.resetAllMocks());

  it('throw given an invalid task', function () {
    const invalidTaskName = 'thisisnotavalidtasknameandneverwillbe';
    const runner = () => run(invalidTaskName);

    expect(runner).toThrow(/invalid task/i);
  });

  it('runs specified task with plugin and runner', function () {
    run('testTask');

    const { testTask } = require('./tasks');
    const plugin = require('./plugin_config')();
    const args = testTask.mock.calls[0];
    expect(testTask.mock.calls).toHaveLength(1);
    expect(args[0]).toEqual(plugin);
    expect(args[1]).toBe(run);
  });

  it('returns value returned by task', function () {
    const { testTask } = require('./tasks');

    const symbol = Symbol('foo');
    testTask.mockReturnValue(symbol);
    expect(run('testTask')).toBe(symbol);
  });
});
