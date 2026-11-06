/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BuildkiteClient } from './client.ts';
import { findMergeQueueValidation } from './merge_queue_validation.ts';
import type { Build } from './types/build.ts';

const sha = 'b'.repeat(40);
const queueBranch = 'gh-readonly-queue/main/pr-1-abc';

const build = (overrides: Partial<Build>) =>
  ({ state: 'passed', branch: queueBranch, commit: sha, ...overrides } as Build);

const clientReturning = (builds: Build[]) =>
  ({ getBuildsForCommit: jest.fn().mockResolvedValue(builds) } as Pick<
    BuildkiteClient,
    'getBuildsForCommit'
  >);

describe('findMergeQueueValidation', () => {
  it('validates a commit with a passed queue build', async () => {
    const queueBuild = build({});
    const client = clientReturning([queueBuild]);

    const result = await findMergeQueueValidation(client, sha);

    expect(result).toEqual({ status: 'validated', build: queueBuild });
    expect(client.getBuildsForCommit).toHaveBeenCalledWith('kibana-merge-queue', sha, 'passed');
  });

  it('does not validate a passed build that is not on a queue branch', async () => {
    const result = await findMergeQueueValidation(
      clientReturning([build({ branch: 'main' })]),
      sha
    );

    expect(result).toEqual({ status: 'not_validated' });
  });

  it('does not validate a passed queue build for a different commit', async () => {
    const result = await findMergeQueueValidation(
      clientReturning([build({ commit: 'd'.repeat(40) })]),
      sha
    );

    expect(result).toEqual({ status: 'not_validated' });
  });

  it.each(['failed', 'canceled', 'running', 'scheduled'] as const)(
    'does not validate a %s build',
    async (state) => {
      const result = await findMergeQueueValidation(clientReturning([build({ state })]), sha);

      expect(result).toEqual({ status: 'not_validated' });
    }
  );

  it('does not validate when there are no builds', async () => {
    const result = await findMergeQueueValidation(clientReturning([]), sha);

    expect(result).toEqual({ status: 'not_validated' });
  });

  it('counts any qualifying build in the list', async () => {
    const queueBuild = build({});
    const result = await findMergeQueueValidation(
      clientReturning([build({ branch: 'main' }), queueBuild]),
      sha
    );

    expect(result).toEqual({ status: 'validated', build: queueBuild });
  });

  it('reports client errors without throwing', async () => {
    const client = {
      getBuildsForCommit: jest.fn().mockRejectedValue(new Error('HTTP 403')),
    } as Pick<BuildkiteClient, 'getBuildsForCommit'>;

    await expect(findMergeQueueValidation(client, sha)).resolves.toEqual({
      status: 'error',
      message: 'HTTP 403',
    });
  });

  it('reports non-Error rejections as string messages', async () => {
    const client = {
      getBuildsForCommit: jest.fn().mockRejectedValue('boom'),
    } as Pick<BuildkiteClient, 'getBuildsForCommit'>;

    await expect(findMergeQueueValidation(client, sha)).resolves.toEqual({
      status: 'error',
      message: 'boom',
    });
  });

  it('reports a short commit as an error without calling the API', async () => {
    const realClient = new BuildkiteClient({ token: 'test-token' });
    const get = jest.spyOn(realClient.http, 'get');

    const result = await findMergeQueueValidation(realClient, 'a'.repeat(39));

    expect(result).toEqual({
      status: 'error',
      message: expect.stringContaining('Invalid commit hash'),
    });
    expect(get).not.toHaveBeenCalled();
  });

  it('reports a malformed response body as an error', async () => {
    const client = {
      getBuildsForCommit: jest.fn().mockResolvedValue({ message: 'unexpected' }),
    } as Pick<BuildkiteClient, 'getBuildsForCommit'>;

    await expect(findMergeQueueValidation(client, sha)).resolves.toMatchObject({
      status: 'error',
    });
  });
});
