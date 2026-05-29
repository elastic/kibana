/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('../../affected-packages', () => {
  const actual = jest.requireActual('../../affected-packages');
  return {
    ...actual,
    listChangedFiles: jest.fn(),
    getAffectedPackages: jest.fn(),
    getModuleGroup: jest.fn(),
    findModuleForPath: jest.fn(),
  };
});

import {
  findModuleForPath,
  getAffectedPackages,
  getModuleGroup,
  listChangedFiles,
  UNCATEGORIZED_MODULE_ID,
} from '../../affected-packages';
import {
  diffSoftFailConfigs,
  flattenConfigPaths,
  resolveAffectedFtrSolutions,
} from './selective_ftr';

const mockListChangedFiles = listChangedFiles as jest.MockedFunction<typeof listChangedFiles>;
const mockGetAffectedPackages = getAffectedPackages as jest.MockedFunction<
  typeof getAffectedPackages
>;
const mockGetModuleGroup = getModuleGroup as jest.MockedFunction<typeof getModuleGroup>;
const mockFindModuleForPath = findModuleForPath as jest.MockedFunction<typeof findModuleForPath>;

const MERGE_BASE = 'abc123';

describe('resolveAffectedFtrSolutions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    // Default: changed files map to no module (uncategorized) unless overridden.
    mockFindModuleForPath.mockReturnValue(UNCATEGORIZED_MODULE_ID);
    mockGetAffectedPackages.mockResolvedValue(new Set<string>());
    mockGetModuleGroup.mockReturnValue(undefined);
  });

  it('bails (null) when there are no changed files', async () => {
    mockListChangedFiles.mockReturnValue([]);
    const { solutions, reason } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions).toBeNull();
    expect(reason).toMatch(/no changed files/);
  });

  it('bails when a critical shared/CI file changed', async () => {
    mockListChangedFiles.mockReturnValue([
      'package.json',
      'x-pack/solutions/observability/plugins/slo/server/x.ts',
    ]);
    const { solutions, reason } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions).toBeNull();
    expect(reason).toMatch(/critical/);
  });

  it('narrows to a solution attributed purely by path (no owning module)', async () => {
    mockListChangedFiles.mockReturnValue([
      'x-pack/solutions/observability/test/functional/apps/foo/config.ts',
    ]);
    const { solutions } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions && [...solutions]).toEqual(['observability']);
  });

  it('narrows to a solution attributed by module group', async () => {
    mockListChangedFiles.mockReturnValue([
      'x-pack/solutions/security/plugins/security_solution/server/x.ts',
    ]);
    mockGetAffectedPackages.mockResolvedValue(new Set(['@kbn/security-solution-plugin']));
    mockGetModuleGroup.mockImplementation((id) =>
      id === '@kbn/security-solution-plugin' ? 'security' : undefined
    );
    const { solutions } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions && [...solutions]).toEqual(['security']);
  });

  it('collects multiple solutions when the diff spans them', async () => {
    mockListChangedFiles.mockReturnValue([
      'x-pack/solutions/observability/plugins/slo/server/a.ts',
      'x-pack/solutions/search/plugins/enterprise_search/server/b.ts',
    ]);
    const { solutions } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions && [...solutions].sort()).toEqual(['observability', 'search']);
  });

  it('bails when a changed file belongs to the platform group', async () => {
    mockListChangedFiles.mockReturnValue(['src/core/server/http/router.ts']);
    mockFindModuleForPath.mockReturnValue('@kbn/core-http-server-internal');
    mockGetModuleGroup.mockReturnValue('platform');
    const { solutions, reason } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions).toBeNull();
    expect(reason).toMatch(/outside any solution/);
  });

  it('bails when a downstream dependent lives in the platform group', async () => {
    mockListChangedFiles.mockReturnValue([
      'x-pack/solutions/observability/packages/shared-utils/index.ts',
    ]);
    // file attributes to observability by path; downstream pulls in a platform consumer
    mockGetAffectedPackages.mockResolvedValue(
      new Set(['@kbn/obs-shared-utils', '@kbn/some-platform-consumer'])
    );
    mockGetModuleGroup.mockImplementation((id) =>
      id === '@kbn/obs-shared-utils' ? 'observability' : 'platform'
    );
    const { solutions, reason } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions).toBeNull();
    expect(reason).toMatch(/platform\/shared module affected/);
  });

  it('bails when a downstream module has an unrecognized group', async () => {
    mockListChangedFiles.mockReturnValue([
      'x-pack/solutions/search/plugins/enterprise_search/server/a.ts',
    ]);
    mockGetAffectedPackages.mockResolvedValue(new Set(['@kbn/mystery']));
    mockGetModuleGroup.mockReturnValue('galaxy');
    const { solutions, reason } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions).toBeNull();
    expect(reason).toMatch(/unrecognized group/);
  });

  it('expands solutions via the downstream graph (cross-solution dependent)', async () => {
    mockListChangedFiles.mockReturnValue([
      'x-pack/solutions/observability/packages/shared/index.ts',
    ]);
    mockGetAffectedPackages.mockResolvedValue(
      new Set(['@kbn/obs-shared', '@kbn/some-security-consumer'])
    );
    mockGetModuleGroup.mockImplementation((id) =>
      id === '@kbn/obs-shared' ? 'observability' : 'security'
    );
    const { solutions } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions && [...solutions].sort()).toEqual(['observability', 'security']);
  });

  it('bails when affected-package detection throws', async () => {
    mockListChangedFiles.mockReturnValue([
      'x-pack/solutions/observability/plugins/slo/server/a.ts',
    ]);
    mockGetAffectedPackages.mockRejectedValue(new Error('boom'));
    const { solutions, reason } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions).toBeNull();
    expect(reason).toMatch(/affected-package detection failed/);
  });

  it('bails when a file lives under x-pack/solutions but in an unknown solution dir', async () => {
    mockListChangedFiles.mockReturnValue(['x-pack/solutions/made_up/plugins/foo/a.ts']);
    const { solutions, reason } = await resolveAffectedFtrSolutions(MERGE_BASE);
    expect(solutions).toBeNull();
    expect(reason).toMatch(/outside any solution/);
  });
});

describe('flattenConfigPaths', () => {
  it('flattens a queue→configs map', () => {
    const map = new Map<string, string[]>([
      ['q1', ['a', 'b']],
      ['q2', ['c']],
    ]);
    expect(flattenConfigPaths(map).sort()).toEqual(['a', 'b', 'c']);
  });
});

describe('diffSoftFailConfigs', () => {
  it('returns configs present in full but not in blocking', () => {
    const full = new Map<string, string[]>([
      ['q1', ['platform/a', 'oblt/b', 'security/c']],
      ['q2', ['search/d']],
    ]);
    const blocking = new Map<string, string[]>([['q1', ['platform/a', 'oblt/b']]]);
    expect(diffSoftFailConfigs(full, blocking).sort()).toEqual(['search/d', 'security/c']);
  });

  it('returns empty when blocking already covers everything', () => {
    const full = new Map<string, string[]>([['q1', ['a', 'b']]]);
    const blocking = new Map<string, string[]>([['q1', ['a', 'b']]]);
    expect(diffSoftFailConfigs(full, blocking)).toEqual([]);
  });
});
