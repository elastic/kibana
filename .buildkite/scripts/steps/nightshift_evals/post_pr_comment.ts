/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { upsertComment } from '#pipeline-utils';

// One comment slot per task, so a rerun replaces its own comment only.
const task = process.env.NIGHTSHIFT_EVAL_TASK;
const COMMENT_CONTEXT = task ? `nightshift-evals-${task}` : 'nightshift-evals';

const main = async (): Promise<void> => {
  const prNumber = parseInt(process.env.GITHUB_PR_NUMBER ?? '', 10);
  if (!prNumber || isNaN(prNumber)) {
    throw new Error('GITHUB_PR_NUMBER must be a valid integer');
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer);
  }
  const markdown = Buffer.concat(chunks).toString('utf-8').trim();
  if (!markdown) {
    console.log('No markdown content on stdin; skipping comment.');
    return;
  }

  await upsertComment(
    {
      commentBody: `## Nightshift evals: ${task}\n\n${markdown}`,
      commentContext: COMMENT_CONTEXT,
      clearPrevious: true,
    },
    'elastic',
    'kibana',
    prNumber
  );
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
