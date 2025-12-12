/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { listKibanaTeamsTool } from './list_teams';
import { getPackages } from '@kbn/repo-packages';
import { parseToolResultJsonContent } from './test_utils';

jest.mock('@kbn/repo-packages', () => ({ getPackages: jest.fn() }));
jest.mock('@kbn/repo-info', () => ({ REPO_ROOT: '/repo/root' }));

const mockedGetPackages = getPackages as jest.MockedFunction<typeof getPackages>;

describe('listKibanaTeamsTool', () => {
  const createPkg = (name: string, owners: string[]) => ({
    directory: `/pkg/${name}`,
    name,
    manifest: {
      description: `${name} description`,
      owner: owners,
    },
    isPlugin: () => false,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('aggregates unique team owners across packages', async () => {
    mockedGetPackages.mockReturnValue([
      createPkg('pkg-a', ['team-a', 'team-b']),
      createPkg('pkg-b', ['team-b', 'team-c']),
    ] as any);

    const result = await listKibanaTeamsTool.handler({});
    const resultObject = parseToolResultJsonContent(result);

    expect(resultObject.teams.sort()).toEqual(['team-a', 'team-b', 'team-c'].sort());
  });
});
