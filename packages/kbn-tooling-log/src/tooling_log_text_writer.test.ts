/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ToolingLogTextWriter } from './tooling_log_text_writer';

it('throws error if created with invalid level', () => {
  expect(
    () =>
      new ToolingLogTextWriter({
        // @ts-ignore
        level: 'foo',
      })
  ).toThrowErrorMatchingSnapshot();
});

it("throws error if writeTo config is not defined or doesn't have a write method", () => {
  expect(() => {
    new ToolingLogTextWriter({
      level: 'verbose',
      // @ts-ignore
      writeTo: null,
    });
  }).toThrowErrorMatchingSnapshot();

  expect(() => {
    new ToolingLogTextWriter({
      level: 'verbose',
      // @ts-ignore
      writeTo: 'foo',
    });
  }).toThrowErrorMatchingSnapshot();
});

const levels = ['silent', 'verbose', 'debug', 'info', 'warning', 'error'] as const;
const types = ['verbose', 'debug', 'info', 'warning', 'error', 'success'] as const;
for (const level of levels) {
  for (const type of types) {
    it(`level:${level}/type:${type} snapshots`, () => {
      const write = jest.fn();
      const writer = new ToolingLogTextWriter({
        level,
        writeTo: {
          write,
        },
      });

      const written = writer.write({
        type,
        indent: 0,
        args: ['foo'],
      });

      expect(written).toMatchSnapshot('is written');

      if (written) {
        const output = write.mock.calls.reduce((acc, chunk) => `${acc}${chunk}`, '');
        expect(output).toMatchSnapshot('output');
      }
    });
  }
}

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

it('does not write messages from sources in ignoreSources', () => {
  const write = jest.fn();
  const writer = new ToolingLogTextWriter({
    ignoreSources: ['myIgnoredSource'],
    level: 'debug',
    writeTo: {
      write,
    },
  });

  writer.write({
    source: 'myIgnoredSource',
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
  expect(output).toEqual('');
});

it('never ignores write messages from the kibana elasticsearch.deprecation logger context', () => {
  const write = jest.fn();
  const writer = new ToolingLogTextWriter({
    ignoreSources: ['myIgnoredSource'],
    level: 'debug',
    writeTo: {
      write,
    },
  });

  writer.write({
    source: 'myIgnoredSource',
    type: 'write',
    indent: 10,
    args: [
      '%s\n%O\n\n%d',
      '[elasticsearch.deprecation]',
      { foo: { bar: { 1: [1, 2, 3] } }, bar: { bar: { 1: [1, 2, 3] } } },
      Infinity,
    ],
  });

  const output = write.mock.calls.reduce((acc, chunk) => `${acc}${chunk}`, '');
  expect(output).toMatchSnapshot();
});
