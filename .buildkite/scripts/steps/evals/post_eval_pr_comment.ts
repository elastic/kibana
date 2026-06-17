/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Octokit } from '@octokit/rest';

const KIBANA_COMMENT_SIGIL = '<!-- kbn-evals-comparison -->';

async function upsertComment(prNumber: number, body: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN is required');
  }

  const octokit = new Octokit({ auth: token });
  const owner = 'elastic';
  const repo = 'kibana';

  const { data: comments } = await octokit.issues.listComments({
    owner,
    repo,
    issue_number: prNumber,
    per_page: 100,
  });

  const existing = comments.find((c) => c.body?.includes(KIBANA_COMMENT_SIGIL));

  if (existing) {
    await octokit.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body: `${KIBANA_COMMENT_SIGIL}\n\n${body}`,
    });
    console.log(`Updated existing comment ${existing.id} on PR #${prNumber}`);
  } else {
    const { data: created } = await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `${KIBANA_COMMENT_SIGIL}\n\n${body}`,
    });
    console.log(`Created comment ${created.id} on PR #${prNumber}`);
  }
}

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

  await upsertComment(prNumber, markdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
