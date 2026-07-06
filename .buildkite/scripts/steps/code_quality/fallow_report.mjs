/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join } from 'path';

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
        owners: teams
          .flatMap((t) => t.replace('@', '').split(','))
          .filter((t) => t.startsWith('elastic')),
      };
    })
    .filter((e) => e.owners.length > 0);
}

function createOwnerResolver(repoRoot) {
  const entries = parseCodeowners(repoRoot);
  const cache = new Map();

  return function getOwnersForFile(filePath) {
    if (cache.has(filePath)) return cache.get(filePath);

    let owners = [];
    for (const e of entries) {
      if (filePath === e.prefix || filePath.startsWith(e.prefix + '/')) {
        owners = e.owners;
      }
    }
    cache.set(filePath, owners);
    return owners;
  };
}

// --- Metrics ---

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// Complexity-based health score scoped per owner.
// Dead code penalties are excluded: @kbn/* path aliases are not resolved by fallow,
// so unused_files/unused_exports counts are unreliable in Kibana's plugin architecture.
function computeHealthScore(fileScores, complexityFindings, hotspots) {
  const totalFiles = fileScores.length;
  if (!totalFiles) return 0;

  const criticalCount = complexityFindings.filter((f) => f.severity === 'critical').length;
  const lowMaintainability = fileScores.filter((f) => f.maintainability_index < 65).length;

  const penaltyCritical = Math.min((criticalCount / totalFiles) * 20, 20);
  const penaltyMaintainability = Math.min((lowMaintainability / totalFiles) * 15, 15);
  const penaltyHotspots = Math.min((hotspots.length / totalFiles) * 10, 10);

  return Math.max(0, 100 - penaltyCritical - penaltyMaintainability - penaltyHotspots);
}

function avgComplexityDensity(fileScores) {
  if (!fileScores.length) return 0;
  return fileScores.reduce((s, f) => s + f.complexity_density, 0) / fileScores.length;
}

function gradeFromScore(score) {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
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
const getOwnersForFile = createOwnerResolver(process.cwd());
const targetSet = new Set(targetOwners);

// Group findings by owner (only keep target owners to save memory)
const ownerData = new Map();

function addFinding(filePath, category, item) {
  for (const owner of getOwnersForFile(filePath)) {
    if (targetSet.size > 0 && !targetSet.has(owner)) continue;
    if (!ownerData.has(owner)) {
      ownerData.set(owner, {
        complexityFindings: [],
        fileScores: [],
        hotspots: [],
      });
    }
    ownerData.get(owner)[category].push(item);
  }
}

// Complexity (fallow health --format json — top-level, no 'health' wrapper)
for (const f of data.findings ?? []) {
  addFinding(f.path, 'complexityFindings', f);
}

for (const f of data.file_scores ?? []) {
  addFinding(f.path, 'fileScores', f);
}

for (const f of data.hotspots ?? []) {
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
lines.push(
  '  owner                          grade  score   complexity   files  hotspots  critical'
);
for (const owner of filteredOwners) {
  const d = ownerData.get(owner);
  const score = computeHealthScore(d.fileScores, d.complexityFindings, d.hotspots);
  const grade = gradeFromScore(score);
  const density = avgComplexityDensity(d.fileScores);
  const critical = d.complexityFindings.filter((f) => f.severity === 'critical').length;
  const name = `@${owner}`;
  lines.push(
    `  ${name.padEnd(32)} ${grade.padEnd(6)} ${score.toFixed(1).padStart(5)}   ${density
      .toFixed(2)
      .padStart(9)}   ${String(d.fileScores.length).padStart(5)}  ${String(
      d.hotspots.length
    ).padStart(8)}  ${String(critical).padStart(8)}`
  );
}

// Per-owner details
for (const owner of filteredOwners) {
  const d = ownerData.get(owner);
  const teamShort = owner.replace('elastic/', '');

  const critical = d.complexityFindings.filter((f) => f.severity === 'critical');
  const cyclomatics = d.complexityFindings.map((f) => f.cyclomatic);
  const p90 = percentile(cyclomatics, 90);
  const density = avgComplexityDensity(d.fileScores);
  const score = computeHealthScore(d.fileScores, d.complexityFindings, d.hotspots);
  const grade = gradeFromScore(score);
  const emoji = gradeEmoji(grade);

  lines.push(`\n--- @${owner}`);

  // Complexity
  lines.push(
    `\nComplexity: ${emoji} ${grade} (${score.toFixed(1)}/100)  density: ${density.toFixed(2)}`
  );
  lines.push(`  P90 cyclomatic: ${p90}`);
  lines.push(`  Hotspots: ${d.hotspots.length}`);
  if (critical.length > 0) {
    lines.push(`  Critical functions (${critical.length}):`);
    const sorted = [...critical].sort((a, b) => b.cyclomatic - a.cyclomatic);
    for (const f of sorted) {
      lines.push(
        `    ${f.path}:${f.line}  ${f.name}  cyclomatic=${f.cyclomatic} cognitive=${f.cognitive}`
      );
    }
  }

  // Annotation
  annotationLines.push(
    `- **${teamShort}**: ${emoji} ${grade} (${score.toFixed(1)}/100) · density ${density.toFixed(
      2
    )} · ${critical.length} critical`
  );
}

// Print sections
console.log(lines.join('\n'));

// Print annotation after marker
console.log('\n---ANNOTATION---');
console.log(annotationLines.join('\n'));
