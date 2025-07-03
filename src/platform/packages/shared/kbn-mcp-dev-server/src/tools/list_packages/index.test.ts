/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { listPackages } from '.';
import { getPackages } from '@kbn/repo-packages';

jest.mock('@kbn/repo-packages', () => ({ getPackages: jest.fn() }));
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo/root' }));

const mockedGetPackages = getPackages as jest.MockedFunction<typeof getPackages>;

describe('listPackages', () => {
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

  it('returns packages and plugins separated', () => {
    mockedGetPackages.mockReturnValue([
      createPkg('pkg-a', ['team-a'], false),
      createPkg('plugin-b', ['team-b'], true),
    ] as any);

    const result = listPackages({});

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].name).toBe('pkg-a');
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins![0].name).toBe('plugin-b');
  });

  it('excludes plugins when excludePlugins flag is true', () => {
    mockedGetPackages.mockReturnValue([
      createPkg('pkg-a', ['team-a'], false),
      createPkg('plugin-b', ['team-b'], true),
    ] as any);

    const result = listPackages({ excludePlugins: true });

    expect(result.packages).toHaveLength(1);
    expect(result.plugins).toBeUndefined();
  });

  it('filters by owner when owner param is provided', () => {
    mockedGetPackages.mockReturnValue([
      createPkg('pkg-a', ['team-a'], false),
      createPkg('pkg-b', ['team-b'], false),
    ] as any);

    const result = listPackages({ owner: 'team-b' });

    expect(result.packages).toHaveLength(1);
    expect(result.packages[0].name).toBe('pkg-b');
  });

  it('does not filter by owner when owner is an empty string', () => {
    mockedGetPackages.mockReturnValue([
      createPkg('pkg-a', ['team-a'], false),
      createPkg('pkg-b', ['team-b'], false),
    ] as any);

    const result = listPackages({ owner: '' });

    expect(result.packages).toHaveLength(2);
  });
});
