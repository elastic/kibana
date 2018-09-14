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

import { get } from 'lodash';
import { RunContext } from '../task';
import { extractTaskDefinitions } from './extract_task_definitions';

interface Opts {
  numTasks: number;
  numWorkers?: number;
}

const getMockTaskDefinitions = (opts: Opts) => {
  const { numTasks, numWorkers } = opts;
  const tasks: any = {};

  for (let i = 0; i < numTasks; i++) {
    const type = `test_task_type_${i}`;
    tasks[type] = {
      type,
      title: 'Test',
      description: 'one super cool task',
      numWorkers: numWorkers ? numWorkers : 1,
      createTaskRunner(context: RunContext) {
        const incre = get(context, 'taskInstance.state.incre', -1);
        return {
          run: () => ({
            state: {
              incre: incre + 1,
            },
            runAt: Date.now(),
          }),
        };
      },
    };
  }
  return tasks;
};

describe('extractTaskDefinitions', () => {
  it('provides tasks with defaults if there are no overrides', () => {
    const maxWorkers = 10;
    const overrideNumWorkers = {};
    const taskDefinitions = getMockTaskDefinitions({ numTasks: 3 });
    const result = extractTaskDefinitions(maxWorkers, taskDefinitions, overrideNumWorkers);

    expect(result).toMatchInlineSnapshot(`
Object {
  "test_task_type_0": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 1,
    "timeOut": "5m",
    "title": "Test",
    "type": "test_task_type_0",
  },
  "test_task_type_1": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 1,
    "timeOut": "5m",
    "title": "Test",
    "type": "test_task_type_1",
  },
  "test_task_type_2": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 1,
    "timeOut": "5m",
    "title": "Test",
    "type": "test_task_type_2",
  },
}
`);
  });

  it('scales down task definitions workers if larger than max workers', () => {
    const maxWorkers = 2;
    const overrideNumWorkers = {};
    const taskDefinitions = getMockTaskDefinitions({ numTasks: 2, numWorkers: 5 });
    const result = extractTaskDefinitions(maxWorkers, taskDefinitions, overrideNumWorkers);

    expect(result).toMatchInlineSnapshot(`
Object {
  "test_task_type_0": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 2,
    "timeOut": "5m",
    "title": "Test",
    "type": "test_task_type_0",
  },
  "test_task_type_1": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 2,
    "timeOut": "5m",
    "title": "Test",
    "type": "test_task_type_1",
  },
}
`);
  });

  it('incorporates overrideNumWorkers to give certain type an override of number of workers', () => {
    const overrideNumWorkers = {
      test_task_type_0: 5,
      test_task_type_1: 2,
    };
    const maxWorkers = 5;
    const taskDefinitions = getMockTaskDefinitions({ numTasks: 3 });
    const result = extractTaskDefinitions(maxWorkers, taskDefinitions, overrideNumWorkers);

    expect(result).toMatchInlineSnapshot(`
Object {
  "test_task_type_0": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 5,
    "timeOut": "5m",
    "title": "Test",
    "type": "test_task_type_0",
  },
  "test_task_type_1": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 2,
    "timeOut": "5m",
    "title": "Test",
    "type": "test_task_type_1",
  },
  "test_task_type_2": Object {
    "createTaskRunner": [Function],
    "description": "one super cool task",
    "numWorkers": 1,
    "timeOut": "5m",
    "title": "Test",
    "type": "test_task_type_2",
  },
}
`);
  });

  it('throws a validation exception for invalid task definition', () => {
    const runExtract = () => {
      const maxWorkers = 10;
      const overrideNumWorkers = {};
      const taskDefinitions = {
        some_kind_of_task: {
          fail: 'extremely', // cause a validation failure
          type: 'breaky_task',
          title: 'Test XYZ',
          description: `Actually this won't work`,
          createTaskRunner() {
            return {
              async run() {
                return {};
              },
            };
          },
        },
      };

      return extractTaskDefinitions(maxWorkers, taskDefinitions, overrideNumWorkers);
    };

    expect(runExtract).toThrowError();
  });
});
