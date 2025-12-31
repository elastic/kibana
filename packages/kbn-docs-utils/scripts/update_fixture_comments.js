/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const fs = require('node:fs');
const path = require('node:path');

const categories = [
  { key: 'missingComments', title: 'missing comments' },
  { key: 'isAnyType', title: 'any usage' },
  { key: 'noReferences', title: 'no references' },
];

/**
 * Reads stats from the snapshot JSON file.
 */
const readStatsFromSnapshot = () => {
  const snapshotPath = path.resolve(
    __dirname,
    '../src/integration_tests/snapshots/plugin_a.stats.json'
  );

  if (!fs.existsSync(snapshotPath)) {
    console.error(`Stats snapshot file not found: ${snapshotPath}`);
    console.error('Run the integration tests first to generate the snapshot.');
    process.exit(1);
  }

  return JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
};

const normalizePath = (statPath) =>
  path.resolve(__dirname, '..', statPath.replace(/^packages\/kbn-docs-utils\//, ''));

const emptyCategories = () =>
  categories.reduce((acc, { key }) => {
    acc[key] = [];
    return acc;
  }, {});

const groupByFile = (stats) => {
  const byFile = new Map();
  categories.forEach(({ key }) => {
    const entries = stats[key] || [];
    entries.forEach((entry) => {
      const absPath = normalizePath(entry.path);
      if (!byFile.has(absPath)) byFile.set(absPath, emptyCategories());
      byFile.get(absPath)[key].push(entry);
    });
  });
  return byFile;
};

const formatCategory = (title, entries) => {
  const count = entries.length;
  const lines = [`//   ${title} (${count}):`];
  const sorted = [...entries].sort((a, b) => {
    const lineA = a.lineNumber ?? Number.MAX_SAFE_INTEGER;
    const lineB = b.lineNumber ?? Number.MAX_SAFE_INTEGER;
    return lineA === lineB ? a.label.localeCompare(b.label) : lineA - lineB;
  });
  sorted.forEach((entry) => {
    const lineInfo = entry.lineNumber != null ? `line ${entry.lineNumber}` : 'unknown line';
    lines.push(`//     ${lineInfo} - ${entry.label}`);
  });
  return lines.join('\n');
};

const buildBlock = (fileStats) => {
  const parts = ['// Expected issues:'];
  let added = false;
  categories.forEach(({ key, title }) => {
    const entries = fileStats[key] || [];
    if (!entries.length) return;
    parts.push(formatCategory(title, entries));
    added = true;
  });
  if (!added) {
    parts.push('//   none');
  }
  return `${parts.join('\n')}\n`;
};

const replaceBlock = (content, block) => {
  const marker = '// Expected issues:';
  const idx = content.lastIndexOf(marker);
  if (idx === -1) {
    const trimmed = content.endsWith('\n') ? content : `${content}\n`;
    return `${trimmed}${block}`;
  }
  return `${content.slice(0, idx)}${block}`;
};

const main = () => {
  const stats = readStatsFromSnapshot();
  const byFile = groupByFile(stats);

  byFile.forEach((fileStats, absPath) => {
    if (!fs.existsSync(absPath)) return;
    const original = fs.readFileSync(absPath, 'utf8');
    const block = buildBlock(fileStats);
    const next = replaceBlock(original, block);
    if (next !== original) {
      fs.writeFileSync(absPath, next, 'utf8');
      console.log(`Updated: ${absPath}`);
    }
  });
};

main();
