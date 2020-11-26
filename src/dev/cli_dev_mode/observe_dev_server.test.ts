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

import { Readable } from 'stream';

import * as Rx from 'rxjs';
import execa from 'execa';

import { observeDevServer } from './observe_dev_server';

const mockStdout = () =>
  new Readable({
    read() {
      this.push(null);
    },
  });

jest.mock('execa', () => {
  return {
    node: jest.fn(() => {
      return {
        kill: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
        stdout: mockStdout(),
        stderr: mockStdout(),
      };
    }),
  };
});

jest.spyOn(process, 'on').mockImplementation(() => process);
jest.spyOn(process, 'off').mockImplementation(() => process);

expect.addSnapshotSerializer({
  test: (v) =>
    typeof v === 'object' &&
    v !== null &&
    typeof v.env === 'object' &&
    v.env !== null &&
    !v.env['<inheritted process.env>'],

  serialize(val, config, indentation, depth, refs, printer) {
    const customizations: Record<string, unknown> = {
      '<inheritted process.env>': true,
    };
    for (const [key, value] of Object.entries(val.env)) {
      if (process.env[key] !== value) {
        customizations[key] = value;
      }
    }

    return printer(
      {
        ...val,
        env: customizations,
      },
      config,
      indentation,
      depth,
      refs
    );
  },
});

beforeEach(() => {
  jest.clearAllMocks();
});

it(`forks the script with execa.node, passes it the args, and subs/unsubs to correct events`, () => {
  const state$ = observeDevServer({
    script: './some_script.js',
    argv: ['foo', 'bar'],
    gracefulTimeout: 5000,
    restart$: Rx.EMPTY,
  });

  const errors: any[] = [];
  state$
    .subscribe({
      error: (error) => {
        errors.push(error);
      },
    })
    .unsubscribe();

  expect(errors).toEqual([]);

  const mock = (execa.node as jest.Mock).mock;
  expect(mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "./some_script.js",
        Array [
          "foo",
          "bar",
        ],
        Object {
          "env": Object {
            "<inheritted process.env>": true,
            "ELASTIC_APM_SERVICE_NAME": "kibana",
            "isDevCliChild": "true",
          },
          "nodeOptions": Array [],
          "stdio": "pipe",
        },
      ],
    ]
  `);
  expect(mock.results[0].value.on.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "exit",
        [Function],
      ],
      Array [
        "error",
        [Function],
      ],
      Array [
        "message",
        [Function],
      ],
    ]
  `);
  expect(mock.results[0].value.off.mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "error",
        [Function],
      ],
      Array [
        "message",
        [Function],
      ],
      Array [
        "exit",
        [Function],
      ],
    ]
  `);
  expect((process.on as jest.Mock).mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "exit",
        [Function],
      ],
      Array [
        "SIGTERM",
        [Function],
      ],
      Array [
        "SIGINT",
        [Function],
      ],
    ]
  `);
  expect((process.off as jest.Mock).mock.calls).toMatchInlineSnapshot(`
    Array [
      Array [
        "exit",
        [Function],
      ],
      Array [
        "SIGTERM",
        [Function],
      ],
      Array [
        "SIGINT",
        [Function],
      ],
    ]
  `);
});
