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

import { relative } from 'path';
import { SchemaError } from '.';

/**
 * Make all paths in stacktrace relative.
 */
export const cleanStack = (stack: string) =>
  stack
    .split('\n')
    .filter(line => !line.includes('node_modules/') && !line.includes('internal/'))
    .map(line => {
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
