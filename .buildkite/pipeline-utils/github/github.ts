/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';

const github = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

let prChangesCache: null | RestEndpointMethodTypes['pulls']['listFiles']['response']['data'] = null;

export const getPrChanges = async (
  owner = process.env.GITHUB_PR_BASE_OWNER,
  repo = process.env.GITHUB_PR_BASE_REPO,
  prNumber: undefined | string | number = process.env.GITHUB_PR_NUMBER
) => {
  if (!owner || !repo || !prNumber) {
    throw Error(
      "Couldn't retrieve Github PR info from environment variables in order to retrieve PR changes"
    );
  }

  const files = await github.paginate(github.pulls.listFiles, {
    owner,
    repo,
    pull_number: typeof prNumber === 'number' ? prNumber : parseInt(prNumber, 10),
    per_page: 100,
  });

  return files;
};

export const getPrChangesCached = async () => {
  prChangesCache = prChangesCache || (await getPrChanges());
  return prChangesCache;
};

export const areChangesSkippable = async (
  skippablePaths: RegExp[],
  requiredPaths: RegExp[] = [],
  changes: null | RestEndpointMethodTypes['pulls']['listFiles']['response']['data'] = null
) => {
  const prChanges = changes || (await getPrChangesCached());

  if (prChanges.length >= 3000) {
    return false;
  }

  if (requiredPaths?.length) {
    const someFilesMatchRequired = requiredPaths.some((path) =>
      prChanges.some(
        (change) => change.filename.match(path) || change.previous_filename?.match(path)
      )
    );

    if (someFilesMatchRequired) {
      return false;
    }
  }

  const someFilesNotSkippable = prChanges.some(
    (change) =>
      !skippablePaths.some(
        (path) =>
          change.filename.match(path) &&
          (!change.previous_filename || change.previous_filename.match(path))
      )
  );

  return !someFilesNotSkippable;
};

export const doAnyChangesMatch = async (
  requiredPaths: RegExp[],
  changes: null | RestEndpointMethodTypes['pulls']['listFiles']['response']['data'] = null
) => {
  const prChanges = changes || (await getPrChangesCached());

  if (prChanges.length >= 3000) {
    return true;
  }

  const anyFilesMatchRequired = requiredPaths.some((path) =>
    prChanges.some((change) => change.filename.match(path) || change.previous_filename?.match(path))
  );

  return anyFilesMatchRequired;
};
