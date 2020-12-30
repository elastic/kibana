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
    expect(args).toEqual(['ls-files', '-dmt', '--', '/foo/bar/x']);
    expect(options).toEqual({
      cwd: '/foo/bar/x',
    });

    return {
      stdout: [
        'C kbn-optimizer/package.json',
        'C kbn-optimizer/src/common/bundle.ts',
        'R kbn-optimizer/src/common/bundles.ts',
        'C kbn-optimizer/src/common/bundles.ts',
        'R kbn-optimizer/src/get_bundle_definitions.test.ts',
        'C kbn-optimizer/src/get_bundle_definitions.test.ts',
      ].join('\n'),
    };
  });

  await expect(getChanges('/foo/bar/x')).resolves.toMatchInlineSnapshot(`
    Map {
      "/foo/bar/x/kbn-optimizer/package.json" => "modified",
      "/foo/bar/x/kbn-optimizer/src/common/bundle.ts" => "modified",
      "/foo/bar/x/kbn-optimizer/src/common/bundles.ts" => "deleted",
      "/foo/bar/x/kbn-optimizer/src/get_bundle_definitions.test.ts" => "deleted",
    }
  `);
});
