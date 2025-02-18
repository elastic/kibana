/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import parseArgs from 'minimist';
import { upsertComment, addComment } from '#pipeline-utils';

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

export function commentOnPR({
  messageTemplate,
  context,
  clearPrevious,
}: {
  messageTemplate: string;
  context?: string;
  clearPrevious: boolean;
}) {
  const message = messageTemplate.replace(/\${([^}]+)}/g, (_, envVar) => {
    if (ALLOWED_ENV_VARS.includes(envVar)) {
      return process.env[envVar] || '';
    } else {
      return '${' + envVar + '}';
    }
  });

  if (context) {
    return upsertComment({ commentBody: message, commentContext: context, clearPrevious });
  } else {
    return addComment(message);
  }
}

if (require.main === module) {
  const args = parseArgs<{
    context?: string;
    message: string;
    'clear-previous'?: boolean | string;
  }>(process.argv.slice(2), {
    string: ['message', 'context'],
    boolean: ['clear-previous'],
  });

  if (!args.message) {
    throw new Error(
      `No message template provided for ${process.argv[1]}, use --message to provide one.`
    );
  } else {
    console.log(`Using message template: ${args.message}`);
  }

  commentOnPR({
    messageTemplate: args.message,
    context: args.context,
    clearPrevious:
      typeof args['clear-previous'] === 'string'
        ? !!args['clear-previous'].match(/(1|true)/i)
        : !!args['clear-previous'],
  }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
