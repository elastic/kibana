/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import glob from 'glob';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import execa from 'execa';

/**
 * Run a command and stream its output in real-time.
 */
function streamExec(
  cmd: string,
  args: string[],
  opts: execa.Options & { label?: string; log?: { info(msg: string): void } }
): Promise<{ exitCode: number }> {
  const { label = cmd, log: logger, ...execaOpts } = opts;

  return new Promise((resolve) => {
    const child = execa(cmd, args, { ...execaOpts, stdio: 'pipe', reject: false });
    const startTime = Date.now();

    child.stdout?.pipe(process.stdout);
    child.stderr?.pipe(process.stderr);

    const heartbeat = setInterval(() => {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      if (logger) {
        logger.info(`  ${label}: still running... (${elapsed}s elapsed)`);
      }
    }, 10_000);

    child.then((result) => {
      clearInterval(heartbeat);
      resolve({ exitCode: result.exitCode ?? 1 });
    });
  });
}

/**
 * Group an array of file paths by their top-level directory (relative to the
 * repo root).  Files at the root level are grouped under ".".
 */
function groupByTopDir(files: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const file of files) {
    const rel = path.relative(REPO_ROOT, file);
    const topDir = rel.split(path.sep)[0] || '.';
    let list = groups.get(topDir);
    if (!list) {
      list = [];
      groups.set(topDir, list);
    }
    list.push(file);
  }
  return groups;
}

run(
  async ({ log, flags }) => {
    const skipOxlint = !!(flags['skip-oxlint'] || false);

    // ── Step 1: oxlint (fast pass, ~5 s for the whole repo) ──────────────
    if (!skipOxlint) {
      log.info('Running oxlint...');
      const t0 = Date.now();
      const oxlintResult = await streamExec('npx', ['oxlint', '--quiet', '--config', '.oxlintrc.json'], {
        cwd: REPO_ROOT,
        label: 'oxlint',
        log,
      });
      const dt = Date.now() - t0;

      if (oxlintResult.exitCode !== 0) {
        log.error(`oxlint found errors (${dt}ms) ❌`);
        process.exit(1);
      } else {
        log.info(`oxlint passed (${dt}ms) ✅`);
      }
    }

    // ── Step 2: ESLint (Node API, linted per directory for progress) ─────
    const useCache = !!(flags.cache ?? true);
    const fix = !!flags.fix;
    const filePatterns = flags._.length > 0 ? (flags._ as string[]) : ['.'];

    log.info(`Running ESLint (cache: ${useCache}, fix: ${fix})...`);
    const eslintStart = Date.now();

    const { ESLint } = await import('eslint');
    const eslint = new ESLint({ cwd: REPO_ROOT, cache: useCache, fix });

    // Discover all lintable files, then filter out ignored ones
    log.info('  Discovering files...');
    const allFiles: string[] = [];
    for (const pattern of filePatterns) {
      if (pattern === '.') {
        const found = glob.sync('**/*.{js,mjs,ts,tsx}', {
          cwd: REPO_ROOT,
          absolute: true,
          ignore: ['**/node_modules/**', '**/target/**', '**/build/**'],
        });
        allFiles.push(...found);
      } else {
        allFiles.push(path.resolve(REPO_ROOT, pattern));
      }
    }

    // Filter out files ESLint would ignore
    const files: string[] = [];
    for (const file of allFiles) {
      if (!(await eslint.isPathIgnored(file))) {
        files.push(file);
      }
    }

    log.info(`  Found ${files.length} files to lint`);

    // Group files by top-level directory so we can report per-directory progress
    const groups = groupByTopDir(files);
    const dirNames = [...groups.keys()].sort();

    let totalErrors = 0;
    let totalWarnings = 0;
    let totalFiles = 0;
    const allResults: import('eslint').ESLint.LintResult[] = [];

    for (const dir of dirNames) {
      const dirFiles = groups.get(dir)!;
      const dirStart = Date.now();

      log.info(
        `  [${totalFiles}/${files.length}] Linting ${dir}/ (${dirFiles.length} files)...`
      );

      let results: import('eslint').ESLint.LintResult[];
      try {
        results = await eslint.lintFiles(dirFiles);
      } catch (err: any) {
        // Some plugins (e.g. eslint-plugin-formatjs) throw on certain AST
        // patterns instead of reporting a lint error.  Log and continue so
        // the rest of the repo can still be linted.
        const dirTime = ((Date.now() - dirStart) / 1000).toFixed(1);
        log.error(
          `  [${totalFiles}/${files.length}] ${dir}/ CRASHED after ${dirTime}s — ${err.message.split('\n')[0]}`
        );
        totalErrors++;
        continue;
      }

      allResults.push(...results);

      let dirErrors = 0;
      let dirWarnings = 0;
      for (const r of results) {
        dirErrors += r.errorCount;
        dirWarnings += r.warningCount;
      }

      totalErrors += dirErrors;
      totalWarnings += dirWarnings;
      totalFiles += results.length;

      const dirTime = ((Date.now() - dirStart) / 1000).toFixed(1);

      if (dirErrors > 0 || dirWarnings > 0) {
        log.info(
          `  [${totalFiles}/${files.length}] ${dir}/ done in ${dirTime}s — ${dirErrors} errors, ${dirWarnings} warnings`
        );
      }
    }

    // Apply fixes if requested
    if (fix) {
      await ESLint.outputFixes(allResults);
    }

    // Format and print results (only files with issues)
    const formatter = await eslint.loadFormatter('stylish');
    const output = await formatter.format(allResults);
    if (output.trim()) {
      process.stdout.write(output + '\n');
    }

    const eslintTime = ((Date.now() - eslintStart) / 1000).toFixed(1);

    if (totalErrors > 0) {
      log.error(
        `ESLint: ${totalErrors} errors, ${totalWarnings} warnings across ${totalFiles} files (${eslintTime}s) ❌`
      );
      process.exit(1);
    } else {
      log.info(
        `ESLint: ${totalWarnings} warnings across ${totalFiles} files (${eslintTime}s) ✅`
      );
    }
  },
  {
    description: 'Lint all JavaScript/TypeScript files with oxlint + ESLint',
    flags: {
      boolean: ['cache', 'fix', 'skip-oxlint'],
      default: {
        cache: true,
        'skip-oxlint': false,
      },
      help: `
        --no-cache        Disable ESLint caching
        --fix             Auto-fix problems
        --skip-oxlint     Skip the oxlint pass
      `,
    },
  }
);
