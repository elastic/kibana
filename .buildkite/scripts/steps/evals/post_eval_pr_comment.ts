/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { upsertComment } from '#pipeline-utils';

// Scope the comment to the suite so each suite gets its own PR comment slot.
// Falls back to the generic context for local runs where EVAL_SUITE_ID is not set.
const suiteId = process.env.EVAL_SUITE_ID;
const COMMENT_CONTEXT = suiteId ? `kbn-evals-comparison-${suiteId}` : 'kbn-evals-comparison';

async function main(): Promise<void> {
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

  // Set EVAL_COMMENT_CLEAR_PREVIOUS=1 to delete and recreate the comment
  // (moves it to the bottom of the thread) instead of updating in-place.
  const clearPrevious = process.env.EVAL_COMMENT_CLEAR_PREVIOUS === '1';

  await upsertComment(
    { commentBody: markdown, commentContext: COMMENT_CONTEXT, clearPrevious },
    'elastic',
    'kibana',
    prNumber
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
