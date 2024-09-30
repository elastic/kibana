/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { relative } from 'path';
import { SchemaError } from '.';

/**
 * Make all paths in stacktrace relative.
 */
export const cleanStack = (stack: string) =>
  stack
    .split('\n')
    .filter((line) => !line.includes('node_modules/') && !line.includes('internal/'))
    .map((line) => {
      const parts = /.*\((.*)\).?/.exec(line) || [];

      if (parts.length === 0) {
        return line;
      }

      const path = parts[1];
      return line.replace(path, relative(process.cwd(), path));
    })
    .join('\n');

// TODO This is skipped because it fails depending on Node version. That might
// not be a problem, but I think we should wait with including this test until
// we've made a proper decision around error handling in the new platform, see
// https://github.com/elastic/kibana/issues/12947
test.skip('includes stack', () => {
  try {
    throw new SchemaError('test');
  } catch (e) {
    expect(cleanStack(e.stack)).toMatchSnapshot();
  }
});
