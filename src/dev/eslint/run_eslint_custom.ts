/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import os from 'os';
import execa from 'execa';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import type { Package } from '@kbn/repo-packages';
import { getPackages } from '@kbn/repo-packages';
import type { ToolingLog } from '@kbn/tooling-log';

interface EslintJsonMessage {
  ruleId?: string;
  message?: string;
}

interface EslintJsonFile {
  filePath: string;
  messages: EslintJsonMessage[];
}

interface EslintRunResult {
  name: string;
  directory: string;
  report: EslintJsonFile[];
  exitCode: number;
  stderr?: string;
}

type FormatterFn = (log: ToolingLog, results: EslintRunResult[]) => void;

run(
  async ({ log, flags }) => {
    const eslintConf = String(flags['eslint-config']);
    const formatter = String(flags.formatter);
    const concurrency = Number(flags.concurrency);
    const filter = typeof flags.filter === 'string' ? (flags.filter as string) : '';

    const availableParallelism = os.availableParallelism() ?? 1;

    if (concurrency > availableParallelism) {
      log.warning(
        `Available parallelism (${availableParallelism}) is lower than requested concurrency (${concurrency}). Will use maximum allowed instead (${availableParallelism}).`
      );
    }

    const usedConcurrency = Math.max(
      concurrency > availableParallelism ? availableParallelism : concurrency
    );

    log.info(`Using eslint config at ${eslintConf}.`);

    if (formatter) {
      log.info(`Using results formatter at ${formatter}.`);
    }

    log.info(`Running with ${usedConcurrency} workers.`);

    const items = getPackages(REPO_ROOT);

    const thunks: Array<() => Promise<EslintRunResult>> = items
      .filter((item) =>
        filter ? item.directory.includes(filter) || item.name.includes(filter) : true
      )
      .map((pkg) => {
        return () => {
          if (!formatter) {
            log.info(`Linting ${pkg.directory} (config: ${eslintConf})`);
          }
          return runEslintOnEntry(pkg, {
            json: !!formatter,
            stream: !formatter,
            eslintConf,
          }).then((res) => {
            if (!formatter) {
              log.info(`Completed ${pkg.directory} (exit ${res.exitCode})`);
            }
            return res;
          });
        };
      });

    let results: EslintRunResult[] = [];

    if (formatter) {
      // When a formatter is set, we display a progress bar where we update on each completed package.
      const total = thunks.length;

      const render = (done: number, tot: number) => {
        const pct = tot === 0 ? 100 : Math.floor((done / tot) * 100);

        log.write(`\rProgress: ${done}/${tot} (${pct}%)`);
      };

      render(0, total);

      results = await runBatchedPromises(thunks, usedConcurrency, (done, tot) => render(done, tot));

      // Finalize progress with a newline
      log.write('\n');
    } else {
      // No formatter: stream worker output as-is, no progress bar
      results = await runBatchedPromises(thunks, usedConcurrency);
    }

    if (formatter) {
      const formatterFn = formatter
        ? (await loadFormatterModule(formatter, log)) || defaultFormatter
        : defaultFormatter;

      formatterFn(log, results);
    }

    // Exit status
    if (formatter) {
      const totalFindings = results.reduce((acc, r) => {
        if (!r || !Array.isArray(r.report)) return acc;

        const count = r.report.reduce((fAcc, f) => fAcc + (f.messages?.length || 0), 0);

        return acc + count;
      }, 0);

      if (totalFindings > 0) {
        process.exit(1);
      }
    } else {
      const hadFailures = results.some((r) => (r.exitCode ?? 0) !== 0);

      if (hadFailures) {
        process.exit(1);
      }
    }
  },
  {
    description: 'Run a custom eslint config on kibana packages',
    flags: {
      string: ['concurrency', 'formatter', 'eslint-config', 'filter'],
      default: {
        concurrency: 1,
        'eslint-config': 'eslintrc.js',
      },
      help: `
        --concurrency <n>       Number of parallel ESLint workers (default: CPU count)
        --formatter <path>      Optional module path default-exporting a function to format results
        --eslint-config <path>  Optional path to an eslint config (default: eslintrc.js)
        --filter <path>         Optional filter: match package folder substring or exact package name
      `,
    },
  }
);

function defaultFormatter(log: ToolingLog, results: EslintRunResult[]) {
  // Build a simple summary and print it as-is
  const summary = new Map<string, Map<string, number>>();

  for (const r of results) {
    if (!r || !Array.isArray(r.report)) continue;

    let pkgMap = summary.get(r.name);

    if (!pkgMap) {
      pkgMap = new Map();
      summary.set(r.name, pkgMap);
    }

    for (const file of r.report) {
      const msgs = Array.isArray(file?.messages) ? file.messages : [];

      for (const m of msgs) {
        const key = m && typeof m.message === 'string' ? m.message : String(m?.ruleId || 'unknown');
        pkgMap.set(key, (pkgMap.get(key) || 0) + 1);
      }
    }
  }

  for (const [name, counts] of summary) {
    if (!counts || counts.size === 0) continue;

    log.info(name);

    for (const [msg, count] of counts) {
      log.info(`${msg} ${count}`);
    }

    log.write('\n');
  }
}

async function loadFormatterModule(modPath: string, log: ToolingLog): Promise<FormatterFn | null> {
  const absoluteModulePath = path.isAbsolute(modPath) ? modPath : path.resolve(REPO_ROOT, modPath);

  const isFormatterFn = (x: unknown): x is FormatterFn => typeof x === 'function';

  const isDict = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null;

  try {
    const module = await import(absoluteModulePath);
    if (isDict(module)) {
      const d = (module as { default?: unknown }).default;

      if (isFormatterFn(d)) {
        return d;
      }
    }
  } catch (e) {
    log.error(`Error in loading formatter ${e}`);
  }

  log.warning(
    `Formatter module does not have a default exported function. Please export a default function from ${modPath}.`
  );
  return null;
}

async function runEslintOnEntry(
  { name, directory }: Package,
  opts: { json: boolean; stream: boolean; eslintConf: string }
): Promise<EslintRunResult> {
  const glob = `${directory}/**/*.{ts,tsx,js,jsx}`;

  const args = [
    'scripts/eslint',
    '--no-eslintrc',
    '--no-inline-config',
    '--config',
    opts.eslintConf,
    glob,
  ];

  if (opts.json) {
    args.push('--format', 'json');
  }

  const { stdout, stderr, exitCode } = await execa('node', args, {
    cwd: REPO_ROOT,
    reject: false, // we handle non-zero exit codes ourselves
    env: {
      CI_STATS_DISABLED: 'true',
    },
    stdio: opts.stream ? 'inherit' : 'pipe',
  });

  let report: EslintJsonFile[] = [];
  if (opts.json && !opts.stream) {
    // Try robustly reading JSON via ESLint's --output-file to avoid stdout noise
    try {
      // If stdout is valid JSON, use it first
      if (stdout && stdout.trim().startsWith('[')) {
        report = JSON.parse(stdout) as EslintJsonFile[];
      }
    } catch (_e) {
      // ignore
    }
  }

  return {
    name,
    directory,
    report,
    exitCode: exitCode ?? 1,
    stderr,
  };
}

function runBatchedPromises<T>(
  promiseCreators: Array<() => Promise<T>>,
  maxParallel: number,
  onProgress?: (completed: number, total: number) => void
) {
  const results: T[] = [];

  let i = 0;

  const total = promiseCreators.length;

  const next: () => Promise<any> = () => {
    if (i >= promiseCreators.length) {
      return Promise.resolve();
    }

    const promiseCreator = promiseCreators[i++];

    return Promise.resolve(promiseCreator()).then((result) => {
      results.push(result);

      if (onProgress) onProgress(results.length, total);

      return next();
    });
  };

  const tasks = Array.from({ length: maxParallel }, () => next());

  return Promise.all(tasks).then(() => results);
}
