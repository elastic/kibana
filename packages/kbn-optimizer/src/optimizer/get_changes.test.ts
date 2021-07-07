/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('execa');

import { getChanges } from './get_changes';
import { REPO_ROOT, createAbsolutePathSerializer } from '@kbn/dev-utils';

const execa: jest.Mock = jest.requireMock('execa');

expect.addSnapshotSerializer(createAbsolutePathSerializer());

it('parses git ls-files output', async () => {
  expect.assertions(4);

  execa.mockImplementation((cmd, args, options) => {
    expect(cmd).toBe('git');
    expect(args).toEqual(['ls-files', '-dmt', '--', 'foo/bar/x']);
    expect(options).toEqual({
      cwd: REPO_ROOT,
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

  const changes = await getChanges('foo/bar/x');

  expect(changes).toMatchInlineSnapshot(`
    Map {
      <absolute path>/kbn-optimizer/package.json => "modified",
      <absolute path>/kbn-optimizer/src/common/bundle.ts => "modified",
      <absolute path>/kbn-optimizer/src/common/bundles.ts => "deleted",
      <absolute path>/kbn-optimizer/src/get_bundle_definitions.test.ts => "deleted",
    }
  `);
});
