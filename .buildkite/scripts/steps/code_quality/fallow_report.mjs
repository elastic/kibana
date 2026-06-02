/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';

// --- CODEOWNERS resolution ---
// Simple prefix matching instead of `ignore` library to avoid OOM on large repos.
// CODEOWNERS entries are processed in order; last match wins (GitHub semantics).

function parseCodeowners(repoRoot) {
  const content = readFileSync(join(repoRoot, '.github', 'CODEOWNERS'), 'utf8');
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((line) => {
      const [rawPath, ...teams] = line.split(/\s+/);
      const cleaned = rawPath
        .replace(/^\//, '')
        .replace(/\/\*\*$/, '')
        .replace(/\/$/, '');
      return {
        prefix: cleaned,
        owner: teams
          .flatMap((t) => t.replace('@', '').split(','))
          .filter((t) => t.startsWith('elastic'))[0],
      };
    })
    .filter((e) => e.owner);
}

function createOwnerResolver(repoRoot) {
  const entries = parseCodeowners(repoRoot);
  const cache = new Map();

  return function getOwnerForFile(filePath) {
    const dir = dirname(filePath);
    if (cache.has(dir)) return cache.get(dir);

    let owner = 'unknown';
    for (const e of entries) {
      if (filePath === e.prefix || filePath.startsWith(e.prefix + '/')) {
        owner = e.owner;
      }
    }
    cache.set(dir, owner);
    return owner;
  };
}

// --- Metrics ---

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function gradeFromMaintainability(avg) {
  if (avg >= 85) return 'A';
  if (avg >= 70) return 'B';
  if (avg >= 55) return 'C';
  if (avg >= 40) return 'D';
  return 'F';
}

function gradeEmoji(grade) {
  switch (grade[0]) {
    case 'A':
      return '🟢';
    case 'B':
      return '🟡';
    case 'C':
      return '🟠';
    default:
      return '🔴';
  }
}

// --- Main ---

const args = process.argv.slice(2);
const jsonPath = args[0];
const ownersIdx = args.indexOf('--owners');
const targetOwners =
  ownersIdx !== -1
    ? args.slice(ownersIdx + 1).map((o) => o.replace('@', '').replace('elastic/', 'elastic/'))
    : [];

if (!jsonPath) {
  console.error(
    'Usage: node fallow_report.mjs <fallow.json> --owners @elastic/team1 @elastic/team2'
  );
  process.exit(1);
}

const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
const getOwnerForFile = createOwnerResolver(process.cwd());
const targetSet = new Set(targetOwners);

// Group findings by owner (only keep target owners to save memory)
const ownerData = new Map();

function addFinding(filePath, category, item) {
  const owner = getOwnerForFile(filePath);
  if (targetSet.size > 0 && !targetSet.has(owner)) return;
  if (!ownerData.has(owner)) {
    ownerData.set(owner, {
      unusedFiles: [],
      unusedExports: [],
      unusedTypes: [],
      complexityFindings: [],
      fileScores: [],
      hotspots: [],
    });
  }
  ownerData.get(owner)[category].push(item);
}

// Dead code
for (const f of data.check?.unused_files ?? []) {
  addFinding(f.path, 'unusedFiles', f);
}

for (const f of data.check?.unused_exports ?? []) {
  addFinding(f.path, f.is_type_only ? 'unusedTypes' : 'unusedExports', f);
}

for (const f of data.check?.unused_types ?? []) {
  addFinding(f.path, 'unusedTypes', f);
}

// Complexity
for (const f of data.health?.findings ?? []) {
  addFinding(f.path, 'complexityFindings', f);
}

for (const f of data.health?.file_scores ?? []) {
  addFinding(f.path, 'fileScores', f);
}

for (const f of data.health?.hotspots ?? []) {
  addFinding(f.path, 'hotspots', f);
}

// --- Output ---

const filteredOwners = targetOwners.length
  ? targetOwners.filter((o) => ownerData.has(o))
  : [...ownerData.keys()].sort();

const lines = [];
const annotationLines = ['**Code Quality**\n'];

// Summary table
lines.push('--- Per-owner summary');
lines.push('  owner                          grade  score   files  hotspots  critical');
for (const owner of filteredOwners) {
  const d = ownerData.get(owner);
  const avgMaint =
    d.fileScores.length > 0
      ? d.fileScores.reduce((s, f) => s + f.maintainability_index, 0) / d.fileScores.length
      : 0;
  const grade = gradeFromMaintainability(avgMaint);
  const critical = d.complexityFindings.filter((f) => f.severity === 'critical').length;
  const name = `@${owner}`;
  lines.push(
    `  ${name.padEnd(32)} ${grade.padEnd(6)} ${avgMaint.toFixed(1).padStart(5)}   ${String(
      d.fileScores.length
    ).padStart(5)}  ${String(d.hotspots.length).padStart(8)}  ${String(critical).padStart(8)}`
  );
}

// Per-owner details
for (const owner of filteredOwners) {
  const d = ownerData.get(owner);
  const teamShort = owner.replace('elastic/', '');

  const totalDeadCode = d.unusedFiles.length + d.unusedExports.length + d.unusedTypes.length;
  const critical = d.complexityFindings.filter((f) => f.severity === 'critical');
  const cyclomatics = d.complexityFindings.map((f) => f.cyclomatic);
  const p90 = percentile(cyclomatics, 90);
  const avgMaint =
    d.fileScores.length > 0
      ? d.fileScores.reduce((s, f) => s + f.maintainability_index, 0) / d.fileScores.length
      : 0;
  const grade = gradeFromMaintainability(avgMaint);
  const emoji = gradeEmoji(grade);

  lines.push(`\n--- @${owner}`);

  // Dead code
  lines.push(`\nDead code (${totalDeadCode}):`);
  if (d.unusedFiles.length > 0) {
    lines.push(`  Unused files (${d.unusedFiles.length}):`);
    for (const f of d.unusedFiles.slice(0, 15)) {
      lines.push(`    ${f.path}`);
    }
    if (d.unusedFiles.length > 15) {
      lines.push(`    ... and ${d.unusedFiles.length - 15} more`);
    }
  }
  if (d.unusedExports.length > 0) {
    lines.push(`  Unused exports (${d.unusedExports.length}):`);
    for (const f of d.unusedExports.slice(0, 10)) {
      lines.push(`    ${f.path}:${f.line}  ${f.export_name}`);
    }
    if (d.unusedExports.length > 10) {
      lines.push(`    ... and ${d.unusedExports.length - 10} more`);
    }
  }
  if (d.unusedTypes.length > 0) {
    lines.push(`  Unused types (${d.unusedTypes.length}):`);
    for (const f of d.unusedTypes.slice(0, 10)) {
      lines.push(`    ${f.path}:${f.line}  ${f.export_name}`);
    }
    if (d.unusedTypes.length > 10) {
      lines.push(`    ... and ${d.unusedTypes.length - 10} more`);
    }
  }

  // Complexity
  lines.push(`\nComplexity: ${emoji} ${grade} (${avgMaint.toFixed(1)}/100)`);
  lines.push(`  P90 cyclomatic: ${p90}`);
  lines.push(`  Hotspots: ${d.hotspots.length}`);
  if (critical.length > 0) {
    lines.push(`  Critical functions (${critical.length}):`);
    const sorted = [...critical].sort((a, b) => b.cyclomatic - a.cyclomatic);
    for (const f of sorted.slice(0, 10)) {
      lines.push(
        `    ${f.path}:${f.line}  ${f.name}  cyclomatic=${f.cyclomatic} cognitive=${f.cognitive}`
      );
    }
    if (critical.length > 10) {
      lines.push(`    ... and ${critical.length - 10} more`);
    }
  }

  // Annotation
  annotationLines.push(
    `- **${teamShort}**: ${emoji} ${grade} (${avgMaint.toFixed(
      1
    )}/100) · ${totalDeadCode} dead code · ${critical.length} critical functions`
  );
}

// Print sections
console.log(lines.join('\n'));

// Print annotation after marker
console.log('\n---ANNOTATION---');
console.log(annotationLines.join('\n'));
