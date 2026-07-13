/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RestEndpointMethodTypes } from '@octokit/rest';
import { isAutomatedVersionBumpPR } from './utils';

type PrChanges = RestEndpointMethodTypes['pulls']['listFiles']['response']['data'];

const change = (filename: string): PrChanges[number] => ({ filename } as PrChanges[number]);

describe('isAutomatedVersionBumpPR', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, GITHUB_PR_USER: 'kibanamachine' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('allows release branch setup PR changes on bump-versions branches', async () => {
    process.env.GITHUB_PR_BRANCH = 'bump-versions-2026-07-02_10-20-30-release-branch';

    await expect(
      isAutomatedVersionBumpPR([change('package.json'), change('.github/CODEOWNERS')])
    ).resolves.toBe(true);
  });

  it('rejects bump-versions PRs with unexpected files', async () => {
    process.env.GITHUB_PR_BRANCH = 'bump-versions-2026-07-02_10-20-30-release-branch';

    await expect(
      isAutomatedVersionBumpPR([change('package.json'), change('.buildkite/pull_requests.json')])
    ).resolves.toBe(false);
  });

  it('requires bump-versions PRs to come from kibanamachine', async () => {
    process.env.GITHUB_PR_BRANCH = 'bump-versions-2026-07-02_10-20-30-release-branch';
    process.env.GITHUB_PR_USER = 'not-kibanamachine';

    await expect(isAutomatedVersionBumpPR([change('package.json')])).resolves.toBe(false);
  });
});
