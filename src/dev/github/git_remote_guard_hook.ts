/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

export interface HookPayload {
  command?: string;
  cwd?: string;
  workspace_roots?: string[];
  tool_name?: string;
  tool_input?: { command?: string };
}

export interface GuardedRemote {
  remote: string;
  kind: 'pull' | 'push';
}

export function parseEnv() {
  return {
    canonical: (process.env.KIBANA_GIT_CANONICAL_REPO ?? 'elastic/kibana').toLowerCase(),
    bypass: process.env.KIBANA_GIT_REMOTE_GUARD_BYPASS === '1',
    isClaude: process.argv.includes('--claude'),
  };
}

export function runGitRemoteGuardHook() {
  const { canonical, bypass, isClaude } = parseEnv();
  const allow = () => respond(isClaude, 'allow');
  const deny = (msg: string) => respond(isClaude, 'deny', msg);

  if (bypass) return allow();

  let payload: HookPayload = {};
  try {
    // fd 0 = stdin, both Cursor and Claude hooks pipe JSON here
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    /* stdin empty or not JSON */
  }

  const extracted = extractGitCommand(payload, isClaude);
  if (!extracted) return allow();

  const { git, getRemotes, findCanonicalRemote, isNonCanonical, findGuardedRemotes } =
    createGitUtils({ cwd: extracted.cwd, canonical });

  const remotes = getRemotes();
  const canonRemote = findCanonicalRemote(remotes);
  if (!canonRemote) return allow();

  const onMain = git(['branch', '--show-current']) === 'main';
  const guarded = findGuardedRemotes(extracted.cmd, onMain);
  if (guarded.length === 0) return allow();

  const hasForkRemote = [...remotes.values()].some(isNonCanonical);

  for (const { remote, kind } of guarded) {
    const url = remotes.get(remote) ?? git(['remote', 'get-url', remote]);
    if (!url) continue;

    if (kind === 'pull' && isNonCanonical(url)) {
      return deny(
        `Blocked: pulling main from "${remote}" (${url}) which is not elastic/kibana. ` +
          `Use: git pull ${canonRemote} main. ` +
          `Set KIBANA_GIT_REMOTE_GUARD_BYPASS=1 to override.`
      );
    }

    if (kind === 'push' && !isNonCanonical(url) && hasForkRemote) {
      return deny(
        `Blocked: pushing to "${remote}" (${url}) which is elastic/kibana. ` +
          `Push to your fork remote instead. ` +
          `Set KIBANA_GIT_REMOTE_GUARD_BYPASS=1 to override.`
      );
    }
  }

  return allow();
}

// --- response formatting ---

function respond(isClaude: boolean, decision: 'allow' | 'deny', message?: string): never {
  if (decision === 'allow') {
    if (!isClaude) process.stdout.write(JSON.stringify({ permission: 'allow' }) + '\n');
    return process.exit(0);
  }
  const json = isClaude
    ? {
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: message,
        },
      }
    : { continue: false, permission: 'deny', agentMessage: message, userMessage: message };
  process.stdout.write(JSON.stringify(json) + '\n');
  return process.exit(0);
}

// --- payload extraction ---

function extractGitCommand(
  payload: HookPayload,
  isClaude: boolean
): { cmd: string; cwd: string } | null {
  const cmd = isClaude ? payload.tool_input?.command : payload.command;
  if (typeof cmd !== 'string' || !/\bgit\s/.test(cmd)) return null;
  return { cmd, cwd: payload.cwd ?? process.cwd() };
}

// --- git utilities ---

export function createGitUtils(options: { cwd: string; canonical: string }) {
  const { canonical } = options;

  const parseGithubRepo = (url: string): string | null => {
    try {
      const normalized = url.trim().replace(/^git@github\.com:/, 'https://github.com/');
      const { hostname, pathname } = new URL(normalized);
      if (hostname !== 'github.com') return null;
      const [owner, repo] = pathname
        .replace(/^\//, '')
        .replace(/\.git$/, '')
        .split('/');
      return owner && repo ? `${owner}/${repo}`.toLowerCase() : null;
    } catch {
      return null;
    }
  };

  const gitRoot = spawnSync('git', ['rev-parse', '--show-toplevel'], {
    cwd: options.cwd,
    encoding: 'utf8',
    maxBuffer: 2 ** 20,
  });
  const root = gitRoot.error || gitRoot.status !== 0 ? options.cwd : gitRoot.stdout.trim();

  const git = (args: string[]): string | null => {
    const r = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 2 ** 20 });
    return r.error || r.status !== 0 ? null : r.stdout.trim();
  };

  const getRemotes = (): Map<string, string> => {
    const out = git(['remote', '-v']);
    if (!out) return new Map();
    const result = new Map<string, string>();
    for (const line of out.split('\n')) {
      if (!line.endsWith('(fetch)')) continue;
      const [name, url] = line.split(/\s+/);
      if (name && url) result.set(name, url);
    }
    return result;
  };

  const findCanonicalRemote = (remotes: Map<string, string>): string | null => {
    for (const [name, url] of remotes) {
      if (parseGithubRepo(url) === canonical) return name;
    }
    return null;
  };

  // non-GitHub URLs (local paths, self-hosted) are not considered non-canonical
  const isNonCanonical = (url: string): boolean => {
    const parsed = parseGithubRepo(url);
    return parsed !== null && parsed !== canonical;
  };

  const findGuardedRemotes = (command: string, onMain: boolean): GuardedRemote[] => {
    const tracking = git(['rev-parse', '--abbrev-ref', '@{u}']);
    const upstream = tracking?.includes('/') ? tracking.split('/')[0] : null;
    const result: GuardedRemote[] = [];

    // split compound shell commands: "git checkout main && git pull origin main" → segments
    for (const seg of command.split(/\s*(?:&&|\|\||\||;)\s*/)) {
      const [bin, sub, ...rest] = seg.trim().split(/\s+/);
      if (bin !== 'git') continue;

      // e.g. ['--rebase', 'origin', 'main'] → ['origin', 'main']
      const args = rest.filter((t) => !t.startsWith('-'));

      switch (sub) {
        // git pull origin main | git pull origin (on main) | git pull (on main, uses upstream)
        case 'pull':
          if (args.length >= 2 && args[1] === 'main')
            result.push({ remote: args[0], kind: 'pull' });
          else if (args.length === 1 && onMain) result.push({ remote: args[0], kind: 'pull' });
          else if (args.length === 0 && onMain && upstream)
            result.push({ remote: upstream, kind: 'pull' });
          break;
        // git fetch origin main | git fetch origin refs/heads/main
        case 'fetch':
          if (
            args.length >= 2 &&
            args.slice(1).some((r) => r === 'main' || r === 'refs/heads/main')
          )
            result.push({ remote: args[0], kind: 'pull' });
          break;
        // git merge origin/main | git rebase origin/main
        case 'merge':
        case 'rebase': {
          const [remote, branch] = (args[0] ?? '').split('/');
          if (branch === 'main') result.push({ remote, kind: 'pull' });
          break;
        }
        // git push origin my-branch | git push (uses upstream)
        case 'push': {
          const remote = args[0] ?? upstream;
          if (remote) result.push({ remote, kind: 'push' });
          break;
        }
      }
    }
    return result;
  };

  return { git, getRemotes, findCanonicalRemote, isNonCanonical, findGuardedRemotes };
}
