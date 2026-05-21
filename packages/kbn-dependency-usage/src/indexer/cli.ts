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
} from './indexer.ts';
import { createOrUpdateDashboard } from './dashboard.ts';

const today = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// Worker pool — runs `fn` over `items` with at most `concurrency` in-flight.
// Each settled result (fulfilled or rejected) is passed to `onResult` as soon
// as it lands, so the caller can stream-flush docs without waiting for all
// workers to finish.
// ---------------------------------------------------------------------------
async function withConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>,
  onResult: (item: T, result: PromiseSettledResult<R>) => Promise<void>
): Promise<void> {
  const queue = [...items];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift()!;
      let result: PromiseSettledResult<R>;
      try {
        result = { status: 'fulfilled', value: await fn(item) };
      } catch (err) {
        result = { status: 'rejected', reason: err };
      }
      await onResult(item, result);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
}

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
        .option('concurrency', {
          alias: 'c',
          describe: chalk.cyan('Number of plugins to process in parallel'),
          type: 'number',
          default: 4,
        })
        .option('es-url', {
          describe: chalk.yellow('Elasticsearch base URL'),
          type: 'string',
          default: process.env.ELASTICSEARCH_URL ?? 'http://localhost:9200',
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
        .option('exclude-deps', {
          alias: 'x',
          describe: chalk.cyan(
            'Comma-separated patterns to exclude (trailing "/" = prefix, otherwise exact). ' +
              'Default skips internal namespaces and React core.'
          ),
          type: 'string',
          default: DEFAULT_EXCLUDED_DEPS.join(','),
        })
        .option('create-dashboard', {
          alias: 'd',
          describe: chalk.magenta('Create or update the Kibana dependency-usage dashboard after indexing'),
          type: 'boolean',
          default: false,
        })
        .option('kibana-url', {
          describe: chalk.yellow('Kibana base URL (for --create-dashboard)'),
          type: 'string',
          default: process.env.KIBANA_URL ?? 'http://localhost:5601',
        })
        .option('kibana-api-key', {
          describe: chalk.yellow('Kibana API key (for --create-dashboard; falls back to --api-key)'),
          type: 'string',
          default: process.env.KIBANA_API_KEY ?? process.env.ELASTICSEARCH_API_KEY ?? null,
        })
        .option('dashboard-id', {
          describe: chalk.yellow(
            'Existing Kibana dashboard ID to update (for --create-dashboard). ' +
              'Omit to create a new dashboard and print its ID.'
          ),
          type: 'string',
          default: null,
        })
        .option('snyk-mock', {
          describe: chalk.magenta(
            'Create the mock snyk-follower index when --create-dashboard is set. ' +
              'Skipped automatically if the index already exists. Use --no-snyk-mock to disable.'
          ),
          type: 'boolean',
          default: true,
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
        console.error(
          chalk.cyan(
            `Discovered ${plugins.length} plugin(s) — processing with concurrency ${argv.concurrency}`
          )
        );

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

        // 4. Process plugins in parallel, flushing each batch to ES as it finishes
        let totalDocs = 0;
        let failed = 0;
        let completed = 0;

        await withConcurrency(
          plugins,
          argv.concurrency,
          (pluginPath) => buildDocsForPlugin(pluginPath, ctx),
          async (pluginPath, result) => {
            completed++;
            const progress = `[${completed}/${plugins.length}]`;

            if (result.status === 'rejected') {
              failed++;
              console.error(
                chalk.red(`${progress} FAILED ${pluginPath}: ${(result.reason as Error).message}`)
              );
              return;
            }

            const docs = result.value;
            if (docs.length > 0) {
              await indexDocs(docs, opts);
              totalDocs += docs.length;
            }

            console.error(
              chalk.green(`${progress} ✓ ${pluginPath}`) + chalk.gray(` (${docs.length} deps)`)
            );
          }
        );

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

        // 6. Optionally create/update the Kibana dashboard
        if (!opts.dryRun && argv['create-dashboard']) {
          const kibanaApiKey = (argv['kibana-api-key'] as string | null) ?? opts.apiKey;
          if (!kibanaApiKey) {
            console.error(chalk.yellow('Skipping dashboard: no Kibana API key available (set --kibana-api-key or KIBANA_API_KEY)'));
          } else {
            console.error(chalk.cyan('Creating/updating Kibana dashboard…'));
            const { url: dashboardUrl, snykMock: snykResult } = await createOrUpdateDashboard({
              kibanaUrl: argv['kibana-url'] as string,
              kibanaApiKey,
              dashboardId: (argv['dashboard-id'] as string | null) ?? undefined,
              esUrl: argv['es-url'] as string,
              snykMock: argv['snyk-mock'] as boolean,
            });
            if (snykResult === 'created') {
              console.error(chalk.cyan('Created mock snyk-follower index'));
            } else if (snykResult === 'exists') {
              console.error(chalk.gray('Using existing snyk-follower index'));
            }
            console.error(chalk.green(`Dashboard ready: ${dashboardUrl}`));
            if (!argv['dashboard-id']) {
              const newId = dashboardUrl.split('/').pop();
              console.error(chalk.gray(`  Re-run with --dashboard-id ${newId} to update in place`));
            }
          }
        }
      } catch (err) {
        console.error(chalk.red((err as Error).message));
        process.exit(1);
      }
    }
  )
  .help().argv;
