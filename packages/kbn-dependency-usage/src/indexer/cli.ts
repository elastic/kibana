/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @typescript-eslint/no-unused-expressions */

import yargs from 'yargs';
import chalk from 'chalk';

import {
  discoverPlugins,
  buildSharedContext,
  buildDocsForPlugin,
  ensureIndexTemplate,
  indexDocs,
  DEFAULT_EXCLUDED_DEPS,
  type IndexerOptions,
  type DepUsageDoc,
} from './indexer.ts';

const today = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
yargs(process.argv.slice(2))
  .command(
    '*',
    chalk.green('Index per-(plugin, dep) dependency usage docs into Elasticsearch'),
    (y) =>
      y
        .version(false)
        .option('paths', {
          alias: 'p',
          describe: chalk.cyan(
            'Paths to analyse — individual plugin dirs or parent dirs to auto-discover plugins within'
          ),
          type: 'string',
          array: true,
          demandOption: true,
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
            'Number of plugins to cruise before flushing a single bulk request to ES'
          ),
          type: 'number',
          default: 10,
        })
        .option('exclude-deps', {
          alias: 'x',
          describe: chalk.cyan(
            'Comma-separated patterns to exclude (trailing "/" = prefix, otherwise exact). ' +
              'Default skips internal namespaces and React core.'
          ),
          type: 'string',
          default: DEFAULT_EXCLUDED_DEPS.join(','),
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
        // 1. Discover plugins from the supplied paths
        const plugins = discoverPlugins(argv.paths);
        if (plugins.length === 0) {
          console.error(chalk.red('No plugins found under the given paths.'));
          process.exit(1);
        }
        console.error(chalk.cyan(`Discovered ${plugins.length} plugin(s)`));

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

        // 4. Cruise each plugin sequentially, accumulate docs, and flush a bulk
        //    request to ES every `batchSize` plugins.
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

        for (let i = 0; i < plugins.length; i++) {
          const pluginPath = plugins[i];
          const progress = `[${i + 1}/${plugins.length}]`;

          try {
            const docs = await buildDocsForPlugin(pluginPath, ctx);
            pending.push(...docs);
            console.error(
              chalk.green(`${progress} ✓ ${pluginPath}`) + chalk.gray(` (${docs.length} deps)`)
            );
          } catch (err) {
            failed++;
            console.error(chalk.red(`${progress} FAILED ${pluginPath}: ${(err as Error).message}`));
          }

          // Flush after every batchSize plugins, and always on the last one
          const isLast = i === plugins.length - 1;
          if (!opts.dryRun && ((i + 1) % batchSize === 0 || isLast)) {
            await flush();
          }
        }

        // 5. Summary
        const summary = `${totalDocs} docs across ${plugins.length - failed} plugin(s)`;
        if (failed > 0) {
          console.error(chalk.yellow(`Done — ${summary} (${failed} plugin(s) failed)`));
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
