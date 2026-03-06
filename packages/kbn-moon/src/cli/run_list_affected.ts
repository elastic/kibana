/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';

import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';

import { getAffectedPackages, type AffectedPackagesLog } from '../affected';

const scriptName = path.relative(REPO_ROOT, process.argv[1] || 'list-affected-packages');

const cliOptions = {
  usage: `node ${scriptName}`,
  description: `
    List package IDs that are affected by changes compared to a merge base commit.
    Used by CI to filter test configs and locally to see impact of changes.

    Precedence for each setting: CLI flag > environment variable > default.
  `,
  flags: {
    string: ['merge-base', 'strategy'],
    boolean: ['deep', 'json'],
    default: {},
    alias: {
      b: 'merge-base',
      s: 'strategy',
      d: 'deep',
      j: 'json',
    },
    help: `
      --merge-base, -b <commit>   Git ref to compare against (default: GITHUB_PR_MERGE_BASE env or 'origin/main')
      --strategy, -s <name>       How to detect affected packages: 'git' or 'moon' (default: moon)
      --deep, -d                  Include downstream dependents of directly changed packages
      --json, -j                  Output as a JSON array instead of one package per line

      Environment variables (used when flag not set): AFFECTED_STRATEGY, AFFECTED_DOWNSTREAM, GITHUB_PR_MERGE_BASE
    `,
    examples: `
      node ${scriptName}
      node ${scriptName} --deep
      node ${scriptName} --deep --json
      node ${scriptName} --merge-base HEAD~5
      node ${scriptName} --strategy git --deep
      node ${scriptName} -b origin/main -d -j
      AFFECTED_STRATEGY=git node ${scriptName}
    `,
  },
};

const STRATEGIES = ['git', 'moon'] as const;
type Strategy = (typeof STRATEGIES)[number];

function isStrategy(value: unknown): value is Strategy {
  return typeof value === 'string' && STRATEGIES.includes(value as Strategy);
}

export async function runListAffected(): Promise<void> {
  return run(async ({ log, flags }) => {
    const mergeBase =
      (flags['merge-base'] as string | undefined) ||
      process.env.GITHUB_PR_MERGE_BASE ||
      'origin/main';
    const flagStrategy = flags.strategy as string | undefined;
    const strategyRaw =
      (flagStrategy && flagStrategy !== '' ? flagStrategy : undefined) ??
      process.env.AFFECTED_STRATEGY ??
      'moon';

    if (!isStrategy(strategyRaw)) {
      log.error(`Invalid --strategy "${strategyRaw}". Must be one of: ${STRATEGIES.join(', ')}`);
      process.exit(1);
    }

    const strategy = strategyRaw;
    const deep = Boolean(flags.deep) || process.env.AFFECTED_DOWNSTREAM === 'true';
    const json = Boolean(flags.json);

    const affectedLog: AffectedPackagesLog = (message, error) => {
      if (error !== undefined) {
        const err = error instanceof Error ? error : new Error(`${message}: ${String(error)}`);
        log.error(err);
      } else {
        log.warning(message);
      }
    };

    const packages = await getAffectedPackages(
      mergeBase,
      {
        strategy,
        includeDownstream: deep,
        logging: false,
      },
      affectedLog
    );

    const packageList = Array.from(packages).sort();

    if (json) {
      log.write(JSON.stringify(packageList, null, 2));
    } else {
      packageList.forEach((pkg) => log.write(pkg));
    }
  }, cliOptions);
}
