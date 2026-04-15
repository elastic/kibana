/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as fs from 'fs';
import { upsertComment } from '#pipeline-utils';

async function main() {
  const markdown = fs.readFileSync('/dev/stdin', 'utf8').trim();

  if (!markdown) {
    console.log('No markdown content on stdin. Skipping comment.');
    return;
  }

  console.log('Upserting eval comparison comment on PR...');

  await upsertComment({
    commentBody: markdown,
    commentContext: 'kbn-evals-compare',
    clearPrevious: true,
  });

  console.log('Eval comparison comment posted successfully.');
}

main().catch((error) => {
  console.error('Failed to post eval comparison comment:', error);
  process.exit(1);
});
