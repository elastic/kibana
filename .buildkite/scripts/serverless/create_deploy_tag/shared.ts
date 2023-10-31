/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getExec } from './prepared_exec';
import { BuildkiteClient, getGithubClient } from '#pipeline-utils';

const SELECTED_COMMIT_META_KEY = 'selected-commit-hash';

const octokit = getGithubClient();
const exec = getExec(!process.env.CI);

const buildkite = new BuildkiteClient({ exec });

const buildStateToEmoji = (state: string) => {
  return (
    {
      failure: ':x:',
      pending: ':hourglass:',
      success: ':white_check_mark:',
    }[state] || ':question:'
  );
};

export { octokit, exec, buildkite, buildStateToEmoji, SELECTED_COMMIT_META_KEY };
