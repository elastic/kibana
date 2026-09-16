/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import execa from 'execa';
import { buildSharedPackages } from './build_shared_packages';

jest.mock('execa');

const execaMock = execa as jest.MockedFunction<typeof execa>;

describe('buildSharedPackages', () => {
  beforeEach(() => {
    execaMock.mockResolvedValue({} as Awaited<ReturnType<typeof execa>>);
  });

  it('uses the cached development build by default', async () => {
    await buildSharedPackages({ repoRoot: '/repo' });

    expect(execaMock).toHaveBeenCalledWith('pnpm', ['kbn', 'build-shared'], {
      cwd: '/repo',
      stdio: 'inherit',
    });
  });

  it('forwards production and cache options', async () => {
    await buildSharedPackages({ repoRoot: '/repo', dist: true, cache: false });

    expect(execaMock).toHaveBeenCalledWith(
      'pnpm',
      ['kbn', 'build-shared', '--dist', '--no-cache'],
      {
        cwd: '/repo',
        stdio: 'inherit',
      }
    );
  });
});
