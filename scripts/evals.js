#!/usr/bin/env node

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const Fs = require('fs');
const Path = require('path');

const METADATA_RELATIVE_PATH = 'x-pack/platform/packages/shared/kbn-evals/evals.suites.json';

const hasFlag = (args, flag) =>
  args.includes(flag) || args.some((arg) => arg.startsWith(`${flag}=`));

const readMetadata = (repoRoot) => {
  const filePath = Path.join(repoRoot, METADATA_RELATIVE_PATH);
  if (!Fs.existsSync(filePath)) {
    return [];
  }

  try {
    const raw = Fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.suites) ? parsed.suites : [];
  } catch (error) {
    return [];
  }
};

const deriveSuiteRoot = (configPath, repoRoot) => {
  const relPath = configPath.replace(/\\/g, '/');
  const parts = relPath.split('/');
  const suiteIndex = parts.findIndex((part) => part.startsWith('kbn-evals-suite-'));
  if (suiteIndex === -1) {
    return null;
  }
  return parts.slice(0, suiteIndex + 1).join('/');
};

const normalizeSuite = (entry, repoRoot) => {
  const id = entry.id;
  const name = entry.name ?? id;
  const tags = entry.tags ?? [];
  const ciLabels = entry.ciLabels ?? [`evals:${id}`];
  const absoluteConfigPath = Path.resolve(repoRoot, entry.configPath);
  const suiteRoot = deriveSuiteRoot(entry.configPath, repoRoot);
  return {
    id,
    name,
    configPath: entry.configPath,
    absoluteConfigPath,
    suiteRoot,
    relativeSuiteRoot: suiteRoot,
    tags,
    ciLabels,
    description: entry.description,
    source: 'metadata',
  };
};

const logInfo = (message) => console.log(` info ${message}`);
const logWarning = (message) => console.log(`warning ${message}`);
const logError = (message) => console.log(`error ${message}`);

const printSuiteTable = (suites) => {
  if (suites.length === 0) {
    return;
  }

  const idWidth = Math.max('Suite ID'.length, ...suites.map((suite) => suite.id.length));
  const tagsWidth = Math.max(
    'Tags'.length,
    ...suites.map((suite) => (suite.tags.length ? suite.tags.join(', ').length : 1))
  );

  logInfo(`${'Suite ID'.padEnd(idWidth)}  ${'Tags'.padEnd(tagsWidth)}  Config`);
  suites.forEach((suite) => {
    const tags = suite.tags.length ? suite.tags.join(', ') : '-';
    logInfo(`${suite.id.padEnd(idWidth)}  ${tags.padEnd(tagsWidth)}  ${suite.configPath}`);
  });
};

const runFastList = (repoRoot, args) => {
  const metadata = readMetadata(repoRoot);
  if (metadata.length === 0) {
    return false;
  }

  const suites = metadata.map((entry) => normalizeSuite(entry, repoRoot));
  const wantsJson = hasFlag(args, '--json');
  logInfo('Using cached suite metadata (fast). Run with --refresh to rescan configs.');

  if (wantsJson) {
    process.stdout.write(`${JSON.stringify(suites, null, 2)}\n`);
    return true;
  }

  logInfo(`Found ${suites.length} eval suite(s):`);
  printSuiteTable(suites);
  return true;
};

const runFastCiMap = (repoRoot, args) => {
  const metadata = readMetadata(repoRoot);
  if (metadata.length === 0) {
    return false;
  }

  const entries = metadata.flatMap((suite) => {
    const labels = suite.ciLabels?.length ? suite.ciLabels : [`evals:${suite.id}`];
    return labels.map((label) => ({
      label,
      suiteId: suite.id,
      command: `EVALUATION_CONNECTOR_ID=<connector-id> node scripts/evals run --suite ${suite.id}`,
    }));
  });

  const wantsJson = hasFlag(args, '--json');
  if (wantsJson) {
    process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
    return true;
  }

  if (entries.length === 0) {
    logWarning('No eval suite metadata found to generate CI mapping.');
    return true;
  }

  logInfo('CI label mappings:');
  entries.forEach((entry) => {
    logInfo(`- ${entry.label}: ${entry.command}`);
  });
  return true;
};

const ENV_DOCS = [
  {
    name: 'EVALUATION_CONNECTOR_ID',
    description: 'Connector used for LLM-as-a-judge evaluators (required).',
    example: 'EVALUATION_CONNECTOR_ID=bedrock-claude',
  },
  {
    name: 'EVALUATION_REPETITIONS',
    description: 'Overrides configured repetition count for evals.',
    example: 'EVALUATION_REPETITIONS=3',
  },
  {
    name: 'KBN_EVALS_EXECUTOR',
    description: 'Switch to the Phoenix-backed executor.',
    example: 'KBN_EVALS_EXECUTOR=phoenix',
  },
  {
    name: 'PHOENIX_BASE_URL',
    description: 'Phoenix base URL used when KBN_EVALS_EXECUTOR=phoenix.',
    example: 'PHOENIX_BASE_URL=http://localhost:6006',
  },
  {
    name: 'PHOENIX_API_KEY',
    description: 'Phoenix API key used when KBN_EVALS_EXECUTOR=phoenix.',
    example: 'PHOENIX_API_KEY=...',
  },
  {
    name: 'TRACING_ES_URL',
    description: 'Elasticsearch URL for trace-based evaluators.',
    example: 'TRACING_ES_URL=http://elastic:changeme@localhost:9200',
  },
  {
    name: 'EVALUATIONS_ES_URL',
    description: 'Elasticsearch URL where evaluation results are exported.',
    example: 'EVALUATIONS_ES_URL=http://elastic:changeme@localhost:9200',
  },
  {
    name: 'SELECTED_EVALUATORS',
    description: 'Comma-separated list of evaluator names to run.',
    example: 'SELECTED_EVALUATORS="Factuality,Relevance"',
  },
  {
    name: 'RAG_EVAL_K',
    description: 'Overrides default k used by RAG evaluators.',
    example: 'RAG_EVAL_K=5',
  },
  {
    name: 'INDEX_FOCUSED_RAG_EVAL',
    description: 'Restrict RAG evaluators to ground-truth indices.',
    example: 'INDEX_FOCUSED_RAG_EVAL=true',
  },
];

const runFastEnv = () => {
  logInfo('Environment variables:');
  const nameWidth = Math.max('Name'.length, ...ENV_DOCS.map((entry) => entry.name.length));
  const descWidth = Math.max(
    'Description'.length,
    ...ENV_DOCS.map((entry) => entry.description.length)
  );

  logInfo(`${'Name'.padEnd(nameWidth)}  ${'Description'.padEnd(descWidth)}  Example`);
  ENV_DOCS.forEach((entry) => {
    logInfo(
      `${entry.name.padEnd(nameWidth)}  ${entry.description.padEnd(descWidth)}  ${entry.example}`
    );
  });
  return true;
};

const runFastHelp = () => {
  logInfo('Evals CLI');
  logInfo('');
  logInfo('For full command help/flags: node scripts/evals --full-help');
  logInfo('');
  logInfo('Commands:');
  logInfo('  list [--refresh] [--json]     List eval suites');
  logInfo('  run --suite <id> [...]        Run an eval suite');
  logInfo('  doctor                        Check local prerequisites');
  logInfo('  env                           List environment variables');
  logInfo('  ci-map [--json]               Output CI label mapping');
  logInfo('');
  logInfo('Examples:');
  logInfo('  node scripts/evals list');
  logInfo(
    '  node scripts/evals run --suite obs-ai-assistant --evaluation-connector-id bedrock-claude'
  );
  return true;
};

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const repoRoot = process.cwd();

  const hasHelpFlag = hasFlag(args, '--help') || hasFlag(args, '-h');

  // For subcommand-level help, prefer the full CLI help output.
  if (hasHelpFlag && (command === 'list' || command === 'env')) {
    process.env.KBN_PEGGY_REQUIRE_HOOK_LOG ??= 'false';
    require('@kbn/setup-node-env');
    void require('@kbn/evals').cli.run();
    return;
  }

  if (command === 'list' && !hasFlag(args, '--refresh')) {
    if (runFastList(repoRoot, args)) {
      return;
    }
  }

  if (command === 'list' && hasFlag(args, '--refresh') && !hasFlag(args, '--json')) {
    const metadata = readMetadata(repoRoot);
    if (metadata.length > 0) {
      const suites = metadata.map((entry) => normalizeSuite(entry, repoRoot));
      logInfo(`Cached suites (${suites.length}):`);
      printSuiteTable(suites);
      logInfo('Refreshing suite discovery...');
      process.env.KBN_EVALS_LIST_CACHE_PRINTED = 'true';
    }
  }

  if (command === 'ci-map') {
    if (runFastCiMap(repoRoot, args)) {
      return;
    }
  }

  if (command === 'env') {
    if (runFastEnv()) {
      return;
    }
  }

  if (!command || command === 'help' || hasHelpFlag) {
    if (runFastHelp()) {
      return;
    }
  }

  if (hasFlag(args, '--full-help')) {
    process.argv = [process.argv[0], process.argv[1], '--help'];
    process.env.KBN_PEGGY_REQUIRE_HOOK_LOG ??= 'false';
    require('@kbn/setup-node-env');
    void require('@kbn/evals').cli.run();
    return;
  }

  process.env.KBN_PEGGY_REQUIRE_HOOK_LOG ??= 'false';
  require('@kbn/setup-node-env');
  void require('@kbn/evals').cli.run();
}

main();
