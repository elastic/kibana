/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import type { RestEndpointMethodTypes } from '@octokit/rest';
import { getGithubClient } from '#pipeline-utils';

const github = getGithubClient();

const owner = 'elastic';
const repo = 'catalog-info';
const branch = 'kibana/bulk-update';
const base = 'main';
const title = 'Update Kibana packages';

async function main() {
  const cwd = process.cwd();
  const repoDir = process.env.CATALOG_INFO_DIR || path.resolve(cwd, '..', 'catalog-info');

  if (!fs.existsSync(repoDir) || !fs.existsSync(path.join(repoDir, '.git'))) {
    console.error(
      `catalog-info repository not found at ${repoDir}. Clone it or set CATALOG_INFO_DIR.`
    );
    return;
  }

  try {
    // Rebuild automation branch from latest base to avoid non-fast-forward push issues
    console.log(`Fetching origin (base: ${base}) in ${repoDir}`);
    execSync('git fetch origin', { cwd: repoDir, stdio: ['ignore', 'pipe', 'pipe'] });

    // Sync local base to origin/base
    console.log(`Syncing local ${base} to origin/${base}`);
    execSync(`git checkout ${base}`, { cwd: repoDir, stdio: ['ignore', 'pipe', 'pipe'] });
    execSync(`git reset --hard origin/${base}`, {
      cwd: repoDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Create or reset the automation branch from the updated base
    console.log(`Creating/resetting branch ${branch} from origin/${base}`);
    execSync(`git checkout -B ${branch} origin/${base}`, {
      cwd: repoDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Stage generated files (limit scope)
    console.log(`Staging changes under locations/kibana in ${repoDir}`);
    execSync('git add locations/kibana', { cwd: repoDir, stdio: ['ignore', 'pipe', 'pipe'] });

    console.log('Getting git diff of staged changes under locations/kibana');
    const diffStatus = execSync('git diff --cached --name-status -- locations/kibana', {
      cwd: repoDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    if (!diffStatus.trim()) {
      console.log('No staged changes under locations/kibana');
      return;
    }

    const lines = diffStatus
      .split('\n')
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 0 &&
          /locations\/kibana\/kibana-.*\.yml$/.test((l.split(/\s+/)[1] as string | undefined) || '')
      );

    if (lines.length > 0) {
      let table =
        '## Changes in Kibana packages\n\n| package | filename | change |\n|---|---|---|\n';

      for (const line of lines) {
        const [status, id] = line.split(/\s+/);

        let change: string;
        switch (status) {
          case 'A':
            change = 'add';
            break;
          case 'M':
            change = 'update';
            break;
          case 'D':
            change = 'remove';
            break;
          default:
            change = status.toLowerCase();
        }
        table += `| ${id
          .replace('locations/kibana/', '')
          .replace('.yml', '')} | \`${id}\` | **${change}** |\n`;
      }

      const rawBody = `## 🤖 Automated bulk update of Kibana components.

Script executed from \`elastic/kibana/.buildkite/pipelines/catalog/backstage_catalog_sync.yml\`.

${table}`;

      const body = getPRMessage(rawBody);

      // Commit staged changes (if not already committed)
      try {
        execSync('git commit -m "chore(backstage): update Kibana catalog components"', {
          cwd: repoDir,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (commitErr) {
        // Ignore if nothing to commit
      }

      // Push branch (force-with-lease: safe force avoiding overwriting concurrent updates)
      try {
        execSync(`git push --force-with-lease -u origin ${branch}`, {
          cwd: repoDir,
          stdio: ['ignore', 'pipe', 'pipe'],
        });
      } catch (pushErr) {
        console.warn(
          'Warning: failed to push branch (will still attempt PR):',
          (pushErr as Error).message
        );
      }

      // Check for existing PRs (requires branch to be on remote)
      const prs = await github.pulls.list({
        owner,
        repo,
        state: 'open',
        head: `${owner}:${branch}`,
        per_page: 50,
      });
      type Pull = RestEndpointMethodTypes['pulls']['list']['response']['data'][number];

      // Find an existing PR that matches the branch
      const existing: Pull | undefined = prs.data.find((p: Pull) => p.head?.ref === branch);

      // Create or update the PR
      if (!existing) {
        const created = await github.pulls.create({
          owner,
          repo,
          head: branch,
          base,
          title,
          body,
        });
        console.log(`Created PR #${created.data.number}`);
      } else {
        await github.pulls.update({
          owner,
          repo,
          pull_number: existing.number,
          title,
          body,
          base,
        });
        console.log(`Updated PR #${existing.number}`);
      }
    }

    // Keep branch checked out locally for potential incremental follow-up run
  } catch (e) {
    // Non-fatal; log and continue
    console.warn(
      'Warning: failed generating update PR inside Catalog Info repo:',
      (e as Error).message
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

function getPRMessage(rawBody: string) {
  const MAX_LEN = 65536; // GitHub PR body hard limit

  if (rawBody.length > MAX_LEN) {
    // Find last newline before limit to avoid breaking markdown rows

    const safeIdx =
      // give some space for truncation note
      rawBody.lastIndexOf('\n', MAX_LEN - 200) ||
      rawBody.lastIndexOf('\n', MAX_LEN - 1) ||
      MAX_LEN - 1;

    const truncatedChars = rawBody.length - safeIdx;

    return (
      rawBody.slice(0, safeIdx) +
      `\n\n> Note: output truncated (${truncatedChars} chars omitted) to fit GitHub 64k body limit.\n`
    );
  }
}
