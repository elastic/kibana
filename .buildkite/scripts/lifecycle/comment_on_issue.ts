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
  'GITHUB_ISSUE_BASE_OWNER',
  'GITHUB_ISSUE_BASE_REPO',
  'GITHUB_ISSUE_LABELS',
  'GITHUB_ISSUE_NUMBER',
  'GITHUB_ISSUE_TRIGGER_USER',
];

export function commentOnIssue({
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
    return upsertComment(
      { commentBody: message, commentContext: context, clearPrevious },
      process.env.GITHUB_ISSUE_BASE_OWNER,
      process.env.GITHUB_ISSUE_BASE_REPO,
      process.env.GITHUB_ISSUE_NUMBER
    );
  } else {
    return addComment(
      message,
      process.env.GITHUB_ISSUE_BASE_OWNER,
      process.env.GITHUB_ISSUE_BASE_REPO,
      process.env.GITHUB_ISSUE_NUMBER
    );
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

  commentOnIssue({
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
