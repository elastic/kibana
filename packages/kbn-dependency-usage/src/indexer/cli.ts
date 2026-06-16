/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-unused-expressions */

import { readdirSync, existsSync } from 'fs';
import nodePath from 'path';
import yargs from 'yargs';
import chalk from 'chalk';

import { REPO_ROOT } from '@kbn/repo-info';

import {
  discoverPackages,
  buildSharedContext,
  buildDocsForPackage,
  ensureIndexTemplate,
  indexDocs,
  DEFAULT_EXCLUDED_DEPS,
  type IndexerOptions,
  type DepUsageDoc,
} from './indexer.ts';

const today = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Group → paths resolution
// ---------------------------------------------------------------------------

const PLATFORM_PATHS = [
  // x-pack/platform
  'x-pack/platform/plugins/shared',
  'x-pack/platform/plugins/private',
  'x-pack/platform/packages/shared',
  'x-pack/platform/packages/private',
  // x-pack/packages — platform packages not under the x-pack/platform subtree
  'x-pack/packages',
  // src/platform
  'src/platform/plugins/shared',
  'src/platform/plugins/private',
  'src/platform/packages/shared',
  'src/platform/packages/private',
  // src/platform/kbn-ui — platform UI packages outside the plugins/packages subdirs
  'src/platform/kbn-ui',
  // Root-level packages/ — all carry group "platform" in their kibana.jsonc.
  // Note: src/dev and src/cli are excluded because they lack kibana.jsonc manifests.
  'packages',
  // src/core has kibana.jsonc at its root, so discoverPackages() would short-circuit
  // there and never recurse into the 247 individual sub-packages. We point directly at
  // src/core/packages to get granular per-package data instead of one monolithic entry.
  'src/core/packages',
];

function resolveGroupPaths(group: string): string[] {
  if (group === 'platform') return PLATFORM_PATHS;

  if (group === 'solutions') {
    const solutionsDir = nodePath.join(REPO_ROOT, 'x-pack/solutions');
    return readdirSync(solutionsDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .flatMap(({ name }) =>
        ['plugins', 'packages']
          .map((sub) => `x-pack/solutions/${name}/${sub}`)
          .filter((p) => existsSync(nodePath.join(REPO_ROOT, p)))
      );
  }

  throw new Error(`Unknown group '${group}'. Use 'platform', 'solutions', or --paths.`);
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
yargs(process.argv.slice(2))
  .command(
    '*',
    chalk.green('Index per-(package, dependency) usage docs into Elasticsearch'),
    (y) =>
      y
        .version(false)
        .option('group', {
          alias: 'g',
          describe: chalk.cyan(
            "Named group to index: 'platform' (hardcoded x-pack/platform paths) or " +
              "'solutions' (auto-discovered from x-pack/solutions/). Mutually exclusive with --paths."
          ),
          type: 'string',
        })
        .option('paths', {
          alias: 'p',
          describe: chalk.cyan(
            'Search paths to analyse. Each path is scanned recursively for packages ' +
              '(directories containing kibana.jsonc); cruise runs once per discovered package.'
          ),
          type: 'string',
          array: true,
        })
        .option('es-url', {
          describe: chalk.yellow('Elasticsearch base URL'),
          type: 'string',
          default: process.env.ELASTICSEARCH_URL ?? 'https://localhost:9200',
        })
        .option('api-key', {
          describe: chalk.yellow('Elasticsearch API key (id:key)'),
          type: 'string',
          default: process.env.ELASTICSEARCH_API_KEY ?? null,
        })
        .option('index', {
          describe: chalk.blue('Elasticsearch index name'),
          type: 'string',
          default: 'kibana-dependency-usage',
        })
        .option('snapshot-id', {
          alias: 's',
          describe: chalk.blue('Snapshot date used as @timestamp (YYYY-MM-DD)'),
          type: 'string',
          default: today,
        })
        .option('setup-template', {
          alias: 't',
          describe: chalk.magenta('PUT the index template before indexing'),
          type: 'boolean',
          default: false,
        })
        .option('dry-run', {
          alias: 'n',
          describe: chalk.magenta('Print NDJSON to stdout instead of indexing'),
          type: 'boolean',
          default: false,
        })
        .option('batch-size', {
          alias: 'b',
          describe: chalk.cyan(
            'Number of packages to cruise before flushing a single bulk request to ES'
          ),
          type: 'number',
          default: 20,
        })
        .option('exclude-deps', {
          alias: 'x',
          describe: chalk.cyan(
            'Comma-separated patterns to exclude (trailing "/" = prefix, otherwise exact). ' +
              'Default skips internal namespaces and React core.'
          ),
          type: 'string',
          default: DEFAULT_EXCLUDED_DEPS.join(','),
        })
        .check((argv) => {
          if (!argv.group && !argv.paths?.length) {
            throw new Error('Provide either --group or --paths.');
          }
          if (argv.group && argv.paths?.length) {
            throw new Error('--group and --paths are mutually exclusive.');
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(argv['snapshot-id'] as string)) {
            throw new Error('--snapshot-id must be a date in YYYY-MM-DD format.');
          }
          return true;
        }),
    async (argv) => {
      const opts: IndexerOptions = {
        snapshotId: argv['snapshot-id'],
        dryRun: argv['dry-run'],
        esUrl: argv['es-url'],
        apiKey: argv['api-key'],
        indexName: argv.index,
      };

      try {
        // 1. Resolve paths from --group or --paths
        const searchPaths = argv.group ? resolveGroupPaths(argv.group) : (argv.paths as string[]);

        // 2. Optionally set up the ES index template
        if (!opts.dryRun && argv['setup-template']) {
          console.error(chalk.cyan('Putting index template…'));
          await ensureIndexTemplate(opts);
          console.error(chalk.green('Index template OK'));
        }

        // 3. Build shared context once (reads CODEOWNERS, renovate.json, package.json)
        const excludePatterns = (argv['exclude-deps'] as string)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        const ctx = buildSharedContext(opts.snapshotId, excludePatterns);
        if (excludePatterns.length > 0) {
          console.error(chalk.gray(`Excluding deps matching: ${excludePatterns.join(', ')}`));
        }

        // 4. Discover all packages under the resolved search paths, then
        //    cruise each package individually, accumulating docs and flushing
        //    a single bulk request to ES every `batchSize` packages.
        const packages = searchPaths.flatMap((p) => discoverPackages(p));
        if (packages.length === 0) {
          console.error(chalk.red('No packages found under the given paths.'));
          process.exit(1);
        }
        console.error(chalk.cyan(`Discovered ${packages.length} package(s)`));

        const batchSize = argv['batch-size'] as number;
        let totalDocs = 0;
        let failed = 0;
        let pending: DepUsageDoc[] = [];

        const flush = async () => {
          if (pending.length === 0) return;
          await indexDocs(pending, opts);
          totalDocs += pending.length;
          pending = [];
        };

        for (let i = 0; i < packages.length; i++) {
          const pkgPath = packages[i];
          const progress = `[${i + 1}/${packages.length}]`;

          try {
            const docs = await buildDocsForPackage(pkgPath, ctx);
            pending.push(...docs);
            console.error(
              chalk.green(`${progress} ✓ ${pkgPath}`) + chalk.gray(` (${docs.length} deps)`)
            );
          } catch (err) {
            failed++;
            console.error(chalk.red(`${progress} FAILED ${pkgPath}: ${(err as Error).message}`));
          }

          // Flush to ES after every batchSize packages, and always on the last one.
          // In dry-run mode skip intermediate flushes — accumulate everything and
          // write a single contiguous NDJSON stream at the end.
          const isLast = i === packages.length - 1;
          if (!opts.dryRun && ((i + 1) % batchSize === 0 || isLast)) {
            await flush();
          }
        }

        if (opts.dryRun) await flush();

        // 5. Summary
        const summary = `${totalDocs} docs across ${packages.length - failed} package(s)`;
        if (failed > 0) {
          console.error(chalk.yellow(`Done — ${summary} (${failed} package(s) failed)`));
        } else {
          console.error(
            opts.dryRun
              ? chalk.yellow(`Dry-run complete — ${summary}`)
              : chalk.green(`Indexed ${summary}`)
          );
        }
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    }
  )
  .help().argv;
