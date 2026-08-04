/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const THRESHOLD = 0.15;
const MARKER = '<!-- bundle-size-limits-comment -->';
const LIMITS_PATHS = [
  'packages/kbn-optimizer/limits.yml',
  'packages/kbn-rspack-optimizer/limits.yml',
];

const getContent = async ({ github, context }, ref, path) => {
  const { data } = await github.rest.repos.getContent({
    owner: context.repo.owner,
    repo: context.repo.repo,
    path,
    ref,
  });
  return Buffer.from(data.content, 'base64').toString('utf8');
};

const parseYaml = (content) => {
  const result = {};
  for (const line of content.split('\n')) {
    const match = line.match(/^\s{2}(\w+):\s*(\d+)/);
    if (match) result[match[1]] = parseInt(match[2], 10);
  }
  return result;
};

module.exports = async ({ github, context }) => {
  const pr = context.payload.pull_request;

  const bigIncreases = [];
  for (const path of LIMITS_PATHS) {
    const [baseContent, headContent] = await Promise.all([
      getContent({ github, context }, pr.base.sha, path),
      getContent({ github, context }, pr.head.sha, path),
    ]);

    const baseMap = parseYaml(baseContent);
    const headMap = parseYaml(headContent);

    for (const [plugin, headSize] of Object.entries(headMap)) {
      const baseSize = baseMap[plugin];
      if (baseSize != null && headSize > baseSize) {
        const pct = (headSize - baseSize) / baseSize;
        if (pct >= THRESHOLD) {
          bigIncreases.push({ path, plugin, baseSize, headSize, pct });
        }
      }
    }
  }

  const { data: comments } = await github.rest.issues.listComments({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
  });
  const existing = comments.find((c) => c.body && c.body.includes(MARKER));

  if (bigIncreases.length === 0) {
    if (existing) {
      await github.rest.issues.deleteComment({
        owner: context.repo.owner,
        repo: context.repo.repo,
        comment_id: existing.id,
      });
    }
    return;
  }

  const rows = bigIncreases
    .sort((a, b) => b.pct - a.pct)
    .map(
      ({ path, plugin, baseSize, headSize, pct }) =>
        `| \`${path}\` | \`${plugin}\` | ${baseSize.toLocaleString()} | ${headSize.toLocaleString()} | +${(
          pct * 100
        ).toFixed(1)}% |`
    )
    .join('\n');

  const body =
    `@${pr.user.login}, this PR increases one or more page-load bundle sizes by 15% or more:\n\n` +
    `| Limits file | Plugin | Before (bytes) | After (bytes) | Change |\n` +
    `|-------------|--------|----------------|---------------|--------|\n` +
    `${rows}\n\n` +
    `Large bundle size increases can affect page load performance. Consider whether dependencies can be lazy-loaded or code split to reduce the bundle.\n\n` +
    `See the [bundle optimization guide](https://www.elastic.co/docs/extend/kibana/ci-metrics#ci-metric-resolving-overages) for tips.\n\n` +
    `${MARKER}`;

  if (existing) {
    await github.rest.issues.updateComment({
      owner: context.repo.owner,
      repo: context.repo.repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await github.rest.issues.createComment({
      issue_number: context.issue.number,
      owner: context.repo.owner,
      repo: context.repo.repo,
      body,
    });
  }
};
