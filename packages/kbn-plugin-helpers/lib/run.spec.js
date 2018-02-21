/*eslint-env jest*/

const testTask = jest.fn();
const plugin = { id: 'testPlugin' };

jest.mock('./plugin_config', () => () => plugin);
jest.mock('./tasks', () => {
  return { testTask };
});
const run = require('./run');

describe('task runner', () => {
  beforeEach(() => jest.resetAllMocks());

  it('throw given an invalid task', function () {
    const invalidTaskName = 'thisisnotavalidtasknameandneverwillbe';
    const runner = () => run(invalidTaskName);

    expect(runner).toThrow(/invalid task/i);
  });

  it('runs specified task with plugin and runner', function () {
    run('testTask');

    const args = testTask.mock.calls[0];
    expect(testTask.mock.calls).toHaveLength(1);
    expect(args[0]).toBe(plugin);
    expect(args[1]).toBe(run);
  });
});