/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';

import { getExec } from './mock_exec';
import { GitCommitExtract } from './info_sections/commit_info';
import { BuildkiteBuildExtract } from './info_sections/build_info';
import { BuildkiteClient, getGithubClient } from '#pipeline-utils';

const SELECTED_COMMIT_META_KEY = 'selected-commit-hash';
const CURRENT_COMMIT_META_KEY = 'current-commit-hash';

const DEPLOY_TAG_META_KEY = 'deploy-tag';
const COMMIT_INFO_CTX = 'commit-info';
const DRY_RUN_CTX = 'dry-run';

const octokit = getGithubClient();

const exec = getExec(!process.env.CI);

const buildkite = new BuildkiteClient({ exec });

const buildkiteBuildStateToEmoji = (state: string) => {
  return (
    {
      running: '⏳',
      scheduled: '⏳',
      passed: '✅',
      failed: '❌',
      blocked: '❌',
      canceled: '❌',
      canceling: '❌',
      skipped: '❌',
      not_run: '❌',
      finished: '✅',
    }[state] || '❓'
  );
};

export {
  octokit,
  exec,
  buildkite,
  buildkiteBuildStateToEmoji,
  SELECTED_COMMIT_META_KEY,
  COMMIT_INFO_CTX,
  DEPLOY_TAG_META_KEY,
  CURRENT_COMMIT_META_KEY,
  DRY_RUN_CTX,
};

export interface CommitWithStatuses extends GitCommitExtract {
  title: string;
  author: string | undefined;
  checks: {
    onMergeBuild: BuildkiteBuildExtract | null;
    ftrBuild: BuildkiteBuildExtract | null;
    artifactBuild: BuildkiteBuildExtract | null;
  };
}

export function sendSlackMessage(payload: any) {
  if (process.env.DRY_RUN?.match(/(1|true)/i)) {
    const message =
      typeof payload === 'string'
        ? payload
        : JSON.stringify(
            payload,
            // The slack playground doesn't like long strings
            (_key, value) => (value?.length > 301 ? value.slice(0, 300) : value),
            0
          );
    const slackPlaygroundLink = `https://app.slack.com/block-kit-builder/#${encodeURIComponent(
      message
    )}`;

    buildkite.setAnnotation(
      DRY_RUN_CTX,
      'warning',
      `Preview slack message <a href="${slackPlaygroundLink}">here</a>.`
    );
    console.log('DRY_RUN, not sending slack message:', slackPlaygroundLink);

    return Promise.resolve();
  } else if (!process.env.DEPLOY_TAGGER_SLACK_WEBHOOK_URL) {
    console.log('No SLACK_WEBHOOK_URL set, not sending slack message');
    return Promise.resolve();
  } else {
    return axios
      .post(
        process.env.DEPLOY_TAGGER_SLACK_WEBHOOK_URL,
        typeof payload === 'string' ? payload : JSON.stringify(payload)
      )
      .catch((error) => {
        if (axios.isAxiosError(error) && error.response) {
          console.error(
            "Couldn't send slack message.",
            error.response.status,
            error.response.statusText,
            error.message
          );
        } else {
          console.error("Couldn't send slack message.", error.message);
        }
      });
  }
}
