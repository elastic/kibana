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

/*eslint-env jest*/

jest.mock('./plugin_config', () => () => ({ id: 'testPlugin' }));

jest.mock('./tasks', () => {
  return { testTask: jest.fn() };
});

const run = require('./run');

describe('lib/run', () => {
  beforeEach(() => jest.resetAllMocks());

  it('throw given an invalid task', function() {
    const invalidTaskName = 'thisisnotavalidtasknameandneverwillbe';
    const runner = () => run(invalidTaskName);

    expect(runner).toThrow(/invalid task/i);
  });

  it('runs specified task with plugin and runner', function() {
    run('testTask');

    const { testTask } = require('./tasks');
    const plugin = require('./plugin_config')();
    const args = testTask.mock.calls[0];
    expect(testTask.mock.calls).toHaveLength(1);
    expect(args[0]).toEqual(plugin);
    expect(args[1]).toBe(run);
  });

  it('returns value returned by task', function() {
    const { testTask } = require('./tasks');

    const symbol = Symbol('foo');
    testTask.mockReturnValue(symbol);
    expect(run('testTask')).toBe(symbol);
  });
});
