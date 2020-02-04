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

jest.mock('execa');

import { getChanges } from './get_changes';

const execa: jest.Mock = jest.requireMock('execa');

it('parses git ls-files output', async () => {
  expect.assertions(4);

  execa.mockImplementation((cmd, args, options) => {
    expect(cmd).toBe('git');
    expect(args).toEqual(['ls-files', '-dmt', '--', '/foo/bar/x', '/foo/bar/y']);
    expect(options).toEqual({
      cwd: '/foo/bar',
    });

    return {
      stdout: [
        'C x/kbn-optimizer/package.json',
        'C x/kbn-optimizer/src/common/bundle.ts',
        'R x/kbn-optimizer/src/common/bundles.ts',
        'C x/kbn-optimizer/src/common/bundles.ts',
        'R x/kbn-optimizer/src/get_bundle_definitions.test.ts',
        'C x/kbn-optimizer/src/get_bundle_definitions.test.ts',
        'C y/src/plugins/data/public/index.ts',
      ].join('\n'),
    };
  });

  await expect(getChanges('/foo/bar', ['/foo/bar/x', '/foo/bar/y'])).resolves
    .toMatchInlineSnapshot(`
          Map {
            "/foo/bar/x" => Map {
              "/foo/bar/x/kbn-optimizer/package.json" => "modified",
              "/foo/bar/x/kbn-optimizer/src/common/bundle.ts" => "modified",
              "/foo/bar/x/kbn-optimizer/src/common/bundles.ts" => "deleted",
              "/foo/bar/x/kbn-optimizer/src/get_bundle_definitions.test.ts" => "deleted",
            },
            "/foo/bar/y" => Map {
              "/foo/bar/y/src/plugins/data/public/index.ts" => "modified",
            },
          }
        `);
});
