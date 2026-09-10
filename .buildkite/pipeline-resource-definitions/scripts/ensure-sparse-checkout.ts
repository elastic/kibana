#!/usr/bin/env ts-node-script
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Ensures the sparse-checkout plugin on a pipeline resource definition (RRE).
 *
 * When a pipeline's `spec.implementation.spec.pipeline_file` points at a single
 * yml/yaml file, the build only needs that one file to upload its steps. This
 * script adds/normalizes the sparse-checkout plugin so the initial step checks
 * out that very file and nothing else.
 *
 * Usage:
 *   ts-node .buildkite/pipeline-resource-definitions/scripts/ensure-sparse-checkout.ts <file.yml> [more.yml ...]
 */

import fs from 'fs';
import { parseAllDocuments, isMap, isSeq, Pair, YAMLSeq, type Document, type YAMLMap } from 'yaml';

const SPARSE_PLUGIN_KEY = 'sparse-checkout#v1.6.0';
const SPARSE_PLUGIN_PREFIX = 'sparse-checkout';

type Outcome = 'updated' | 'unchanged' | 'skipped';

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error('Usage: ensure-sparse-checkout.ts <path_to_pipeline_file.yml> [more.yml ...]');
    process.exit(1);
  }

  let updated = 0;
  for (const file of files) {
    const outcome = ensureSparseCheckoutForFile(file);
    if (outcome === 'updated') updated++;
    console.log(`${symbol(outcome)} ${outcome.padEnd(9)} ${file}`);
  }

  console.log(`\nDone. ${updated} file(s) updated.`);
}

function ensureSparseCheckoutForFile(file: string): Outcome {
  const original = fs.readFileSync(file, 'utf8');

  // RRE files may contain multiple resources separated by `---`.
  const docs = parseAllDocuments(original);
  if (docs.some((doc) => doc.errors.length > 0)) {
    return 'skipped';
  }

  let changed = false;
  for (const doc of docs) {
    changed = ensureSparsePluginForDoc(doc) || changed;
  }

  if (!changed) {
    return 'unchanged';
  }

  fs.writeFileSync(file, docs.map((doc) => doc.toString({ lineWidth: 0 })).join(''));
  return 'updated';
}

function ensureSparsePluginForDoc(doc: Document): boolean {
  const specNode = doc.getIn(['spec', 'implementation', 'spec'], true);
  if (!isMap(specNode)) {
    return false;
  }

  const pipelineFile = specNode.get('pipeline_file');
  if (typeof pipelineFile !== 'string' || !isYamlFile(pipelineFile)) {
    return false;
  }

  const before = doc.toString({ lineWidth: 0 });
  ensureSparsePlugin(doc, specNode, pipelineFile);
  return doc.toString({ lineWidth: 0 }) !== before;
}

function ensureSparsePlugin(doc: Document, specNode: YAMLMap, pipelineFile: string) {
  const sparseItem = doc.createNode({
    [SPARSE_PLUGIN_KEY]: {
      paths: [pipelineFile],
      cleanup_sparse_state: true,
    },
  });

  const existing = specNode.get('initial_step_plugins', true);
  const plugins: YAMLSeq = isSeq(existing) ? existing : new YAMLSeq();
  if (!isSeq(existing)) {
    insertAfter(specNode, 'pipeline_file', 'initial_step_plugins', plugins);
  }

  // Drop any pre-existing sparse-checkout entry (possibly a different version)
  // so we always land on the canonical single-file config.
  plugins.items = plugins.items.filter((item: unknown) => !isSparseCheckoutItem(item));
  plugins.items.push(sparseItem);
}

function isSparseCheckoutItem(item: unknown): boolean {
  return (
    isMap(item) && item.items.some((pair) => String(pair.key).startsWith(SPARSE_PLUGIN_PREFIX))
  );
}

function insertAfter(mapNode: YAMLMap, afterKey: string, key: string, value: YAMLSeq) {
  const pair = new Pair(key, value);
  const idx = mapNode.items.findIndex((item) => String(item.key) === afterKey);
  if (idx === -1) {
    mapNode.items.push(pair);
  } else {
    mapNode.items.splice(idx + 1, 0, pair);
  }
}

function isYamlFile(file: string): boolean {
  return /\.ya?ml$/i.test(file);
}

function symbol(outcome: Outcome): string {
  if (outcome === 'updated') return '✏️';
  if (outcome === 'skipped') return '⏭️';
  return '✅';
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
