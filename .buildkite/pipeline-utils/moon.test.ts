/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';

import { getAffectedMoonDirectoryTargets } from './moon';
import { getPrChangesCached } from './github';

jest.mock('child_process', () => ({
  ...jest.requireActual('child_process'),
  execFileSync: jest.fn(),
}));

jest.mock('./github', () => ({
  getPrChangesCached: jest.fn(),
}));

const execFileSyncMock = execFileSync as jest.MockedFunction<typeof execFileSync>;
const getPrChangesCachedMock = getPrChangesCached as jest.MockedFunction<
  typeof getPrChangesCached
>;
type PrChanges = Awaited<ReturnType<typeof getPrChangesCached>>;

describe('getAffectedMoonDirectoryTargets', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns the targets that Moon reports as affected', async () => {
    const prChanges: PrChanges = [
      {
        filename: 'x-pack/solutions/security/plugins/security_solution/public/app.tsx',
      } as PrChanges[number],
    ];
    getPrChangesCachedMock.mockResolvedValue(prChanges);

    execFileSyncMock
      .mockReturnValueOnce(
        JSON.stringify({ projects: [{ id: '@kbn/test-suites-xpack-security' }] }) as never
      )
      .mockReturnValueOnce(JSON.stringify({ projects: [] }) as never);

    const affectedTargets = await getAffectedMoonDirectoryTargets([
      { name: 'security', sourceRootPrefix: 'x-pack/solutions/security/' },
      { name: 'observability', sourceRootPrefix: 'x-pack/solutions/observability/' },
    ]);

    expect(affectedTargets).toEqual(['security']);
    expect(execFileSyncMock).toHaveBeenCalledTimes(2);
    expect(execFileSyncMock).toHaveBeenNthCalledWith(
      1,
      'yarn',
      [
        '--silent',
        'moon',
        'query',
        'projects',
        '--affected',
        '--downstream',
        'deep',
        '--source',
        '^x-pack/solutions/security/',
      ],
      expect.objectContaining({
        input: 'x-pack/solutions/security/plugins/security_solution/public/app.tsx',
      })
    );
  });

  it('uses both current and previous filenames for renamed files', async () => {
    const prChanges: PrChanges = [
      {
        filename: 'x-pack/solutions/search/plugins/search_playground/public/new.tsx',
        previous_filename: 'x-pack/solutions/search/plugins/search_playground/public/old.tsx',
      } as PrChanges[number],
    ];
    getPrChangesCachedMock.mockResolvedValue(prChanges);

    execFileSyncMock.mockReturnValue(JSON.stringify({ projects: [] }) as never);

    await getAffectedMoonDirectoryTargets([
      { name: 'search', sourceRootPrefix: 'x-pack/solutions/search/' },
    ]);

    expect(execFileSyncMock).toHaveBeenCalledWith(
      'yarn',
      expect.any(Array),
      expect.objectContaining({
        input: [
          'x-pack/solutions/search/plugins/search_playground/public/new.tsx',
          'x-pack/solutions/search/plugins/search_playground/public/old.tsx',
        ].join('\n'),
      })
    );
  });

  it('falls back to all targets for very large PRs', async () => {
    const prChanges = Array.from(
      { length: 3000 },
      (_, index) => ({ filename: `x-pack/solutions/security/${index}.ts` }) as PrChanges[number]
    );
    getPrChangesCachedMock.mockResolvedValue(prChanges);

    const affectedTargets = await getAffectedMoonDirectoryTargets([
      { name: 'search', sourceRootPrefix: 'x-pack/solutions/search/' },
      { name: 'security', sourceRootPrefix: 'x-pack/solutions/security/' },
    ]);

    expect(affectedTargets).toEqual(['search', 'security']);
    expect(execFileSyncMock).not.toHaveBeenCalled();
  });
});
