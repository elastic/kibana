/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Build } from '#pipeline-utils/buildkite';
import {
  ANNOTATION_CONTEXT,
  pickStaticChecks,
  STATIC_CHECKS_FRAGMENT,
} from './pick_static_checks.ts';

const sha = 'c'.repeat(40);
const webUrl = 'https://buildkite.com/elastic/kibana-merge-queue/builds/5054';
const queueBuild = {
  commit: sha,
  state: 'passed',
  branch: 'gh-readonly-queue/main/pr-1-abc',
  number: 5054,
  web_url: webUrl,
} as Build;

const makeDeps = (lookup: Build[] | Error) => {
  const getBuildsForCommit =
    lookup instanceof Error
      ? jest.fn().mockRejectedValue(lookup)
      : jest.fn().mockResolvedValue(lookup);
  return { client: { getBuildsForCommit, setAnnotation: jest.fn() }, upload: jest.fn() };
};

describe('pickStaticChecks', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips and annotates on a validated commit', async () => {
    const deps = makeDeps([queueBuild]);

    const result = await pickStaticChecks(
      { BUILDKITE_BRANCH: 'main', BUILDKITE_COMMIT: sha },
      deps
    );

    expect(result).toBe('skipped');
    expect(deps.upload).not.toHaveBeenCalled();
    expect(deps.client.setAnnotation).toHaveBeenCalledTimes(1);
    expect(deps.client.setAnnotation).toHaveBeenCalledWith(
      ANNOTATION_CONTEXT,
      'info',
      expect.stringContaining(webUrl)
    );
  });

  it('uploads the fragment when no queue build exists', async () => {
    const deps = makeDeps([]);

    const result = await pickStaticChecks(
      { BUILDKITE_BRANCH: 'main', BUILDKITE_COMMIT: sha },
      deps
    );

    expect(result).toBe('uploaded');
    expect(deps.upload).toHaveBeenCalledTimes(1);
    expect(deps.upload).toHaveBeenCalledWith(STATIC_CHECKS_FRAGMENT);
    expect(deps.client.setAnnotation).not.toHaveBeenCalled();
  });

  it('uploads and warns when the lookup fails', async () => {
    const deps = makeDeps(new Error('HTTP 403'));

    const result = await pickStaticChecks(
      { BUILDKITE_BRANCH: 'main', BUILDKITE_COMMIT: sha },
      deps
    );

    expect(result).toBe('uploaded');
    expect(deps.client.setAnnotation).toHaveBeenCalledWith(
      ANNOTATION_CONTEXT,
      'warning',
      expect.stringContaining('HTTP 403')
    );
    expect(deps.upload).toHaveBeenCalledTimes(1);
  });

  it('warns before uploading so a retry cannot upload twice', async () => {
    const deps = makeDeps(new Error('HTTP 403'));

    await pickStaticChecks({ BUILDKITE_BRANCH: 'main', BUILDKITE_COMMIT: sha }, deps);

    const [annotateOrder] = deps.client.setAnnotation.mock.invocationCallOrder;
    const [uploadOrder] = deps.upload.mock.invocationCallOrder;
    expect(annotateOrder).toBeLessThan(uploadOrder);
  });

  it('does not look up on other branches', async () => {
    const deps = makeDeps([queueBuild]);

    const result = await pickStaticChecks({ BUILDKITE_BRANCH: '9.6', BUILDKITE_COMMIT: sha }, deps);

    expect(result).toBe('uploaded');
    expect(deps.client.getBuildsForCommit).not.toHaveBeenCalled();
    expect(deps.upload).toHaveBeenCalledWith(STATIC_CHECKS_FRAGMENT);
  });

  it.each([undefined, 'c'.repeat(39)])('never skips without a full commit (%s)', async (commit) => {
    const deps = makeDeps([queueBuild]);

    const result = await pickStaticChecks(
      { BUILDKITE_BRANCH: 'main', BUILDKITE_COMMIT: commit },
      deps
    );

    expect(result).toBe('uploaded');
    expect(deps.client.getBuildsForCommit).not.toHaveBeenCalled();
    expect(deps.upload).toHaveBeenCalledWith(STATIC_CHECKS_FRAGMENT);
  });

  it('still skips if the annotation fails', async () => {
    const deps = makeDeps([queueBuild]);
    deps.client.setAnnotation.mockImplementation(() => {
      throw new Error('buildkite-agent unavailable');
    });
    jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      pickStaticChecks({ BUILDKITE_BRANCH: 'main', BUILDKITE_COMMIT: sha }, deps)
    ).resolves.toBe('skipped');
    expect(deps.upload).not.toHaveBeenCalled();
  });

  it('fails loudly if the upload fails', async () => {
    const deps = makeDeps([]);
    deps.upload.mockImplementation(() => {
      throw new Error('upload failed');
    });

    await expect(
      pickStaticChecks({ BUILDKITE_BRANCH: 'main', BUILDKITE_COMMIT: sha }, deps)
    ).rejects.toThrow('upload failed');
  });
});
