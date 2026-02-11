/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { listKibanaPackagesTool } from './list_packages';
import { getPackages } from '@kbn/repo-packages';
import { parseToolResultJsonContent } from './test_utils';

jest.mock('@kbn/repo-packages', () => ({ getPackages: jest.fn() }));
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo/root' }));

const mockedGetPackages = getPackages as jest.MockedFunction<typeof getPackages>;

describe('listKibanaPackagesTool', () => {
  const createPkg = (name: string, owners: string[], isPlugin: boolean) => ({
    directory: `/pkg/${name}`,
    name,
    manifest: {
      description: `${name} description`,
      owner: owners,
    },
    isPlugin: () => isPlugin,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns packages and plugins separated', async () => {
    mockedGetPackages.mockReturnValue([
      createPkg('pkg-a', ['team-a'], false),
      createPkg('plugin-b', ['team-b'], true),
    ] as any);

    const result = await listKibanaPackagesTool.handler({ excludePlugins: false, owner: '' });
    const resultObject = parseToolResultJsonContent(result);

    expect(resultObject.packages).toHaveLength(1);
    expect(resultObject.packages[0].name).toBe('pkg-a');
    expect(resultObject.plugins).toHaveLength(1);
    expect(resultObject.plugins[0].name).toBe('plugin-b');
  });

  it('excludes plugins when excludePlugins flag is true', async () => {
    mockedGetPackages.mockReturnValue([
      createPkg('pkg-a', ['team-a'], false),
      createPkg('plugin-b', ['team-b'], true),
    ] as any);

    const result = await listKibanaPackagesTool.handler({ excludePlugins: true, owner: '' });
    const resultObject = parseToolResultJsonContent(result);

    expect(resultObject.packages).toHaveLength(1);
    expect(resultObject.plugins).toBeUndefined();
  });

  it('filters by owner when owner param is provided', async () => {
    mockedGetPackages.mockReturnValue([
      createPkg('pkg-a', ['team-a'], false),
      createPkg('pkg-b', ['team-b'], false),
    ] as any);

    const result = await listKibanaPackagesTool.handler({ owner: 'team-b', excludePlugins: false });
    const resultObject = parseToolResultJsonContent(result);

    expect(resultObject.packages).toHaveLength(1);
    expect(resultObject.packages[0].name).toBe('pkg-b');
  });

  it('does not filter by owner when owner is an empty string', async () => {
    mockedGetPackages.mockReturnValue([
      createPkg('pkg-a', ['team-a'], false),
      createPkg('pkg-b', ['team-b'], false),
    ] as any);

    const result = await listKibanaPackagesTool.handler({ owner: '', excludePlugins: false });
    const resultObject = parseToolResultJsonContent(result);

    expect(resultObject.packages).toHaveLength(2);
  });
});
