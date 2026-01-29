/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFile, spawn } from 'child_process';
import { promisify } from 'util';

import { run } from '@kbn/dev-cli-runner';
import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

const execFileAsync = promisify(execFile);

/**
 * Find the remote name that points to elastic/kibana (the upstream repo).
 * People use different names: "upstream", "elastic", "kibana", etc.
 */
async function findElasticKibanaRemote(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync('git', ['remote', '-v'], { cwd: REPO_ROOT });
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      // Match remotes pointing to elastic/kibana (via HTTPS or SSH)
      if (
        line.includes('elastic/kibana') ||
        line.includes('github.com:elastic/kibana') ||
        line.includes('github.com/elastic/kibana')
      ) {
        const remoteName = line.split(/\s+/)[0];
        return remoteName;
      }
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Get the list of files that have changed between local HEAD and the remote branch
 * being pushed to. This reads from stdin which is provided by git during pre-push.
 */
async function getChangedFilesForPush(localRef: string, remoteRef: string): Promise<string[]> {
  // If remoteRef is all zeros, this is a new branch - compare against the upstream's default branch
  const isNewBranch = /^0+$/.test(remoteRef);

  let baseRef: string;
  if (isNewBranch) {
    // For new branches, compare against elastic/kibana's main branch
    // This gives the most accurate diff for PRs against the main repo
    const elasticRemote = await findElasticKibanaRemote();
    if (elasticRemote) {
      baseRef = `${elasticRemote}/main`;
    } else {
      // Fallback to origin/main if no elastic/kibana remote found
      baseRef = 'origin/main';
    }
  } else {
    baseRef = remoteRef;
  }

  try {
    const { stdout } = await execFileAsync(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMRT', `${baseRef}...${localRef}`],
      { cwd: REPO_ROOT }
    );

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
  } catch (error) {
    // If the diff fails (e.g., refs don't exist), try a simpler approach
    const { stdout } = await execFileAsync(
      'git',
      ['diff', '--name-only', '--diff-filter=ACMRT', `${baseRef}..${localRef}`],
      { cwd: REPO_ROOT }
    );

    return stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);
  }
}

/**
 * Parse the pre-push hook stdin input
 * Format: <local ref> <local sha> <remote ref> <remote sha>
 */
function parsePushInfo(input: string): { localRef: string; remoteRef: string } | null {
  const lines = input.trim().split('\n').filter(Boolean);
  if (lines.length === 0) {
    return null;
  }

  // Take the first line (there could be multiple if pushing multiple refs)
  const parts = lines[0].split(' ');
  if (parts.length < 4) {
    return null;
  }

  return {
    localRef: parts[1], // local sha
    remoteRef: parts[3], // remote sha
  };
}

run(
  async ({ log, flagsReader }) => {
    // Read push info from stdin (provided by git during pre-push hook)
    // In manual mode, use command line args instead
    let localRef = flagsReader.string('local-ref');
    let remoteRef = flagsReader.string('remote-ref');

    if (!localRef || !remoteRef) {
      // Try to read from stdin (git pre-push provides this)
      const stdin = process.stdin;
      stdin.setEncoding('utf8');

      let input = '';
      for await (const chunk of stdin) {
        input += chunk;
      }

      const pushInfo = parsePushInfo(input);
      if (!pushInfo) {
        log.warning('No push information received. Skipping pre-push checks.');
        log.info(
          'To run manually: node scripts/prepush_hook --local-ref HEAD --remote-ref origin/main'
        );
        return;
      }

      localRef = pushInfo.localRef;
      remoteRef = pushInfo.remoteRef;
    }

    log.info(`Pre-push hook: checking changes from ${remoteRef} to ${localRef}`);

    // Get the list of changed files
    const changedFiles = await getChangedFilesForPush(localRef, remoteRef);

    if (changedFiles.length === 0) {
      log.success('No files changed. Skipping quick checks.');
      return;
    }

    log.info(`Found ${changedFiles.length} changed file(s)`);
    log.debug(`Changed files:\n${changedFiles.map((f) => `  - ${f}`).join('\n')}`);

    // Run quick_checks with the changed files
    log.info('Running quick checks on changed files...');

    const exitCode = await new Promise<number>((resolve) => {
      const child = spawn('node', ['scripts/quick_checks.js', '--files', changedFiles.join(',')], {
        cwd: REPO_ROOT,
        env: { ...process.env },
        stdio: ['inherit', 'inherit', 'inherit'], // Stream output directly to terminal
      });

      child.on('close', (code) => {
        resolve(code ?? 1);
      });

      child.on('error', (error) => {
        log.error(`Failed to start quick checks: ${error.message}`);
        resolve(1);
      });
    });

    if (exitCode !== 0) {
      throw createFailError(
        'Pre-push checks failed. Please fix the issues above before pushing.\n' +
          'You can bypass this check with: git push --no-verify'
      );
    }

    log.success('Pre-push checks passed!');
  },
  {
    description: 'Run quick checks on files changed since the remote branch',
    flags: {
      string: ['local-ref', 'remote-ref'],
      help: `
        --local-ref        The local git ref being pushed (default: read from stdin)
        --remote-ref       The remote git ref being pushed to (default: read from stdin)
      `,
    },
  }
);
