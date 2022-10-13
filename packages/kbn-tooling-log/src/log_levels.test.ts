/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { parseLogLevel } from './log_levels';

it('parses valid log levels correctly', () => {
  expect(parseLogLevel('silent')).toMatchSnapshot('silent');
  expect(parseLogLevel('error')).toMatchSnapshot('error');
  expect(parseLogLevel('warning')).toMatchSnapshot('warning');
  expect(parseLogLevel('info')).toMatchSnapshot('info');
  expect(parseLogLevel('debug')).toMatchSnapshot('debug');
  expect(parseLogLevel('verbose')).toMatchSnapshot('verbose');
});

it('throws error for invalid levels', () => {
  // @ts-ignore
  expect(() => parseLogLevel('warn')).toThrowErrorMatchingSnapshot('warn');
  // @ts-ignore
  expect(() => parseLogLevel('foo')).toThrowErrorMatchingSnapshot('foo');
  // @ts-ignore
  expect(() => parseLogLevel('bar')).toThrowErrorMatchingSnapshot('bar');
});
