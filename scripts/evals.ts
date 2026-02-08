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

function hasFlag(args: string[], flag: string) {
  if (args.includes(flag)) {
    return true;
  }

  for (let i = 0; i < args.length; i++) {
    if (String(args[i]).startsWith(flag + '=')) {
      return true;
    }
  }

  return false;
}

function readMetadata(repoRoot: string) {
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
}

function deriveSuiteRoot(configPath: string) {
  const relPath = String(configPath).replace(/\\/g, '/');
  const parts = relPath.split('/');

  for (let i = 0; i < parts.length; i++) {
    if (String(parts[i]).startsWith('kbn-evals-suite-')) {
      return parts.slice(0, i + 1).join('/');
    }
  }

  return null;
}

function normalizeSuite(entry: any, repoRoot: string) {
  const id = entry.id;
  const name = entry.name !== undefined && entry.name !== null ? entry.name : id;
  const tags = entry.tags !== undefined && entry.tags !== null ? entry.tags : [];
  const ciLabels =
    entry.ciLabels !== undefined && entry.ciLabels !== null ? entry.ciLabels : ['evals:' + id];
  const absoluteConfigPath = Path.resolve(repoRoot, entry.configPath);
  const suiteRoot = deriveSuiteRoot(entry.configPath);

  return {
    id: id,
    name: name,
    configPath: entry.configPath,
    absoluteConfigPath: absoluteConfigPath,
    suiteRoot: suiteRoot,
    relativeSuiteRoot: suiteRoot,
    tags: tags,
    ciLabels: ciLabels,
    description: entry.description,
    source: 'metadata',
  };
}

function logInfo(message: string) {
  console.log(' info ' + message);
}

function logWarning(message: string) {
  console.log('warning ' + message);
}

function printSuiteTable(suites: any[]) {
  if (suites.length === 0) {
    return;
  }

  let idWidth = 'Suite ID'.length;
  let tagsWidth = 'Tags'.length;

  for (let i = 0; i < suites.length; i++) {
    if (String(suites[i].id).length > idWidth) {
      idWidth = String(suites[i].id).length;
    }

    const tagString = suites[i].tags && suites[i].tags.length ? suites[i].tags.join(', ') : '-';
    if (tagString.length > tagsWidth) {
      tagsWidth = tagString.length;
    }
  }

  logInfo('Suite ID'.padEnd(idWidth) + '  ' + 'Tags'.padEnd(tagsWidth) + '  Config');
  for (let j = 0; j < suites.length; j++) {
    const tags = suites[j].tags && suites[j].tags.length ? suites[j].tags.join(', ') : '-';
    logInfo(
      String(suites[j].id).padEnd(idWidth) +
        '  ' +
        tags.padEnd(tagsWidth) +
        '  ' +
        suites[j].configPath
    );
  }
}

function runFastList(repoRoot: string, args: string[]) {
  const metadata = readMetadata(repoRoot);
  if (metadata.length === 0) {
    return false;
  }

  const suites = [];
  for (let i = 0; i < metadata.length; i++) {
    suites.push(normalizeSuite(metadata[i], repoRoot));
  }

  const wantsJson = hasFlag(args, '--json');
  logInfo('Using cached suite metadata (fast). Run with --refresh to rescan configs.');

  if (wantsJson) {
    process.stdout.write(JSON.stringify(suites, null, 2) + '\n');
    return true;
  }

  logInfo('Found ' + suites.length + ' eval suite(s):');
  printSuiteTable(suites);
  return true;
}

function runFastCiMap(repoRoot: string, args: string[]) {
  const metadata = readMetadata(repoRoot);
  if (metadata.length === 0) {
    return false;
  }

  const entries = [];
  for (let i = 0; i < metadata.length; i++) {
    const suite = metadata[i];
    const labels = suite.ciLabels && suite.ciLabels.length ? suite.ciLabels : ['evals:' + suite.id];

    for (let j = 0; j < labels.length; j++) {
      entries.push({
        label: labels[j],
        suiteId: suite.id,
        command:
          'EVALUATION_CONNECTOR_ID=<connector-id> node scripts/evals run --suite ' + suite.id,
      });
    }
  }

  const wantsJson = hasFlag(args, '--json');
  if (wantsJson) {
    process.stdout.write(JSON.stringify(entries, null, 2) + '\n');
    return true;
  }

  if (entries.length === 0) {
    logWarning('No eval suite metadata found to generate CI mapping.');
    return true;
  }

  logInfo('CI label mappings:');
  for (let k = 0; k < entries.length; k++) {
    logInfo('- ' + entries[k].label + ': ' + entries[k].command);
  }
  return true;
}

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

function runFastEnv() {
  logInfo('Environment variables:');

  let nameWidth = 'Name'.length;
  let descWidth = 'Description'.length;

  for (let i = 0; i < ENV_DOCS.length; i++) {
    if (String(ENV_DOCS[i].name).length > nameWidth) {
      nameWidth = String(ENV_DOCS[i].name).length;
    }
    if (String(ENV_DOCS[i].description).length > descWidth) {
      descWidth = String(ENV_DOCS[i].description).length;
    }
  }

  logInfo('Name'.padEnd(nameWidth) + '  ' + 'Description'.padEnd(descWidth) + '  Example');
  for (let j = 0; j < ENV_DOCS.length; j++) {
    logInfo(
      String(ENV_DOCS[j].name).padEnd(nameWidth) +
        '  ' +
        String(ENV_DOCS[j].description).padEnd(descWidth) +
        '  ' +
        String(ENV_DOCS[j].example)
    );
  }

  return true;
}

function runFastHelp() {
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
}

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
      const suites = [];
      for (let i = 0; i < metadata.length; i++) {
        suites.push(normalizeSuite(metadata[i], repoRoot));
      }
      logInfo('Cached suites (' + suites.length + '):');
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
