/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { addComment } from '#pipeline-utils';

const ALLOWED_ENV_VARS = [
  'BUILDKITE_BRANCH',
  'BUILDKITE_BUILD_ID',
  'BUILDKITE_BUILD_NUMBER',
  'BUILDKITE_BUILD_URL',
  'BUILDKITE_COMMIT',
  'BUILDKITE_PIPELINE_NAME',
  'BUILDKITE_PIPELINE_SLUG',
  'GITHUB_PR_BASE_OWNER',
  'GITHUB_PR_BASE_REPO',
  'GITHUB_PR_BRANCH',
  'GITHUB_PR_HEAD_SHA',
  'GITHUB_PR_HEAD_USER',
  'GITHUB_PR_LABELS',
  'GITHUB_PR_NUMBER',
  'GITHUB_PR_OWNER',
  'GITHUB_PR_REPO',
  'GITHUB_PR_TARGET_BRANCH',
  'GITHUB_PR_TRIGGERED_SHA',
  'GITHUB_PR_TRIGGER_USER',
  'GITHUB_PR_USER',
];
const DEFAULT_MESSAGE_TEMPLATE =
  '🚀 Buildkite job started for PR #${GITHUB_PR_NUMBER}: ${BUILDKITE_BUILD_URL}';

export function commentOnPR() {
  const messageTemplate =
    process.argv.slice(2)?.join(' ') ||
    process.env.JOB_START_COMMENT_TEMPLATE ||
    DEFAULT_MESSAGE_TEMPLATE;
  if (messageTemplate === DEFAULT_MESSAGE_TEMPLATE) {
    console.log('No message template provided, using default message');
  } else {
    console.log(`Using message template: ${messageTemplate}`);
  }

  const message = messageTemplate.replace(/\${([^}]+)}/g, (_, envVar) => {
    if (ALLOWED_ENV_VARS.includes(envVar)) {
      return process.env[envVar] || '';
    } else {
      return '${' + envVar + '}';
    }
  });

  return addComment(message);
}

if (require.main === module) {
  commentOnPR().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
