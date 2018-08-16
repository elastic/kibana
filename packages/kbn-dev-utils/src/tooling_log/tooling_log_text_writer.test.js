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

import { ToolingLogTextWriter } from './tooling_log_text_writer';

it('throws error if created with invalid level', () => {
  expect(
    () =>
      new ToolingLogTextWriter({
        level: 'foo',
      })
  ).toThrowErrorMatchingSnapshot();
});

it("throws error if writeTo config is not defined or doesn't have a write method", () => {
  expect(() => {
    new ToolingLogTextWriter({
      level: 'verbose',
      writeTo: null,
    });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new ToolingLogTextWriter({
      level: 'verbose',
      writeTo: 'foo',
    });
  }).toThrowErrorMatchingSnapshot();
});

it('only writes messages when the type matches the level', () => {
  const levels = ['silent', 'verbose', 'debug', 'info', 'warning', 'error'];
  const types = ['verbose', 'debug', 'info', 'warning', 'error', 'success'];
  for (const level of levels) {
    for (const type of types) {
      const write = jest.fn();
      const writer = new ToolingLogTextWriter({
        level,
        writeTo: {
          write,
        },
      });

      writer.write({
        type: type,
        indent: 0,
        args: ['foo'],
      });

      const output = write.mock.calls.reduce((acc, chunk) => `${acc}${chunk}`, '');
      expect(output).toMatchSnapshot(`level:${level}, type:${type}`);
    }
  }
});

it('formats %s patterns and indents multi-line messages correctly', () => {
  const write = jest.fn();
  const writer = new ToolingLogTextWriter({
    level: 'debug',
    writeTo: {
      write,
    },
  });

  writer.write({
    type: 'success',
    indent: 10,
    args: [
      '%s\n%O\n\n%d',
      'foo bar',
      { foo: { bar: { 1: [1, 2, 3] } }, bar: { bar: { 1: [1, 2, 3] } } },
      Infinity,
    ],
  });

  const output = write.mock.calls.reduce((acc, chunk) => `${acc}${chunk}`, '');
  expect(output).toMatchSnapshot();
});
