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
import os from 'os';
import execa from 'execa';
import { run } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';

interface KbnDepEntry {
  name: string;
  folder: string;
}
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
  folder: string;
  report: EslintJsonFile[];
  exitCode: number;
  stderr?: string;
}

interface MinimalLog {
  info: (msg: string) => void;
  write: (chunk: string) => void;
}

type FormatterFn = (log: MinimalLog, results: EslintRunResult[]) => void;

const defaultFormatter: FormatterFn = (log, results) => {
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
};

async function loadFormatterModule(modPath: string): Promise<FormatterFn | null> {
  const abs = path.isAbsolute(modPath) ? modPath : path.resolve(REPO_ROOT, modPath);
  // Try require (supported by @kbn/babel-register), then dynamic import
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const reqMod = require(abs);
    const fn = (reqMod && (reqMod.default || reqMod.printPerfSummary || reqMod.format)) as unknown;
    if (typeof fn === 'function') return fn as FormatterFn;
  } catch (_e) {
    // ignore, fall back to dynamic import
  }
  try {
    const mod = await import(abs);
    const fn = (mod &&
      (mod.default || (mod as any).printPerfSummary || (mod as any).format)) as unknown;
    if (typeof fn === 'function') return fn as FormatterFn;
  } catch (_e) {
    // ignore
  }
  return null;
}

function listKbnDependencyFolders(rootDir: string): KbnDepEntry[] {
  const LEADING_DOT_SLASH = /^\.\//;

  const pkgJsonPath = path.join(rootDir, 'package.json');

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };

  const deps = pkg.dependencies || {};

  const entries: KbnDepEntry[] = [];

  for (const [name, spec] of Object.entries(deps)) {
    if (!name.startsWith('@kbn/')) continue;
    if (typeof spec !== 'string') continue;
    if (!spec.startsWith('link:')) continue;

    const rel = spec.slice('link:'.length);

    if (!rel) continue;

    const folder = rel.replace(LEADING_DOT_SLASH, '');

    const abs = path.join(rootDir, folder);

    if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) {
      entries.push({ name, folder });
    }
  }
  const seen = new Set<string>();

  const out: KbnDepEntry[] = [];

  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const key = `${e.name}|${e.folder}`;

    if (seen.has(key)) continue;

    seen.add(key);

    out.push(e);
  }

  return out;
}

async function runEslintOnEntry(
  entry: KbnDepEntry,
  opts: { json: boolean; stream: boolean; eslintConf: string }
): Promise<EslintRunResult> {
  const glob = `${entry.folder}/**/*.{ts,tsx,js,jsx}`;

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
    try {
      report = stdout ? (JSON.parse(stdout) as EslintJsonFile[]) : [];
    } catch (e) {
      // keep empty report and pass stderr up for debugging
    }
  }

  return {
    name: entry.name,
    folder: entry.folder,
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

run(
  async ({ log, flags }) => {
    const allEntries = listKbnDependencyFolders(REPO_ROOT);

    const userFilters: string[] = (flags._ as string[]).filter((a) => !String(a).startsWith('--'));

    let targets: KbnDepEntry[];
    if (userFilters.length) {
      // Build regex tests for folder gates (precompiled to avoid creating regex in loops)
      const folderRegexes = userFilters.map((f) => {
        // Use the provided string as a literal substring matcher
        const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(escaped);
      });
      const exactNames = new Set(userFilters.filter((f) => f.startsWith('@kbn/')));

      const out: KbnDepEntry[] = [];
      for (const e of allEntries) {
        let match = false;
        if (exactNames.has(e.name)) {
          match = true;
        } else {
          for (const rx of folderRegexes) {
            if (rx.test(e.folder)) {
              match = true;
              break;
            }
          }
        }
        if (match) out.push(e);
      }
      targets = out;
    } else {
      targets = allEntries;
    }

    const defaultCpus = Math.max(1, os.cpus()?.length || 1);

    const concurrency = Math.max(1, Number(flags.concurrency ?? defaultCpus));

    const hasFormatter = Boolean(flags.formatter);
    const eslintConf = String(flags.eslint_conf);

    const thunks = targets.map((t) => () => {
      if (!hasFormatter) {
        log.info(`Linting ${t.folder} (config: ${eslintConf})`);
      }
      return runEslintOnEntry(t, {
        json: !!hasFormatter,
        stream: !hasFormatter,
        eslintConf,
      }).then((res) => {
        if (!hasFormatter) {
          log.info(`Completed ${t.folder} (exit ${res.exitCode})`);
        }
        return res;
      });
    });

    let results: EslintRunResult[] = [];
    if (hasFormatter) {
      // Progress bar: update on each completed package
      const total = thunks.length;

      const render = (done: number, tot: number) => {
        const pct = tot === 0 ? 100 : Math.floor((done / tot) * 100);
        // overwrite the same line
        log.write(`\rProgress: ${done}/${tot} (${pct}%)`);
      };

      // initial render
      render(0, total);

      results = await runBatchedPromises(thunks, concurrency, (done, tot) => render(done, tot));

      // finalize progress line with newline
      log.write('\n');
    } else {
      // No formatter: stream worker output as-is, no progress bar
      results = await runBatchedPromises(thunks, concurrency);
    }

    if (hasFormatter) {
      const fmtFlag = (flags.formatter as string | undefined) || '';

      const formatter = fmtFlag
        ? (await loadFormatterModule(fmtFlag)) || defaultFormatter
        : defaultFormatter;

      formatter(log as MinimalLog, results);
    }

    // Exit status
    if (hasFormatter) {
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
      string: ['concurrency', 'formatter', 'eslint_conf'],
      default: {
        concurrency: String(Math.max(1, os.cpus()?.length || 1)),
        eslint_conf: 'eslint.single-rule.config.cjs',
      },
      help: `
        --concurrency <n>       Number of parallel ESLint workers (default: CPU count)
        --formatter <path>      Optional module path exporting a function to format results
        --eslint_conf <path>    Optional path to an eslint config (default: eslint.single-rule.config.cjs)
        [filters...]            Optional filters: match package folder substring or exact package name
      `,
    },
  }
);
