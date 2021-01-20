/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/* eslint-env jest */

import { format } from 'util';

export function checkMockConsoleLogSnapshot(logMock) {
  const output = logMock.mock.calls
    .reduce((acc, args) => `${acc}${format(...args)}\n`, '')
    .replace(/(^    at.+[>)\d]$\n?)+/m, '    ...stack trace...');

  expect(output).toMatchSnapshot();
}
