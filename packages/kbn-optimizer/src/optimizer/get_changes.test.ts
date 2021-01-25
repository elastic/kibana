/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
