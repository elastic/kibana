/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { WebClient } = require('@slack/web-api');

// --- CODEOWNERS resolution (same as fallow_report.mjs) ---

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

// --- Metrics (same as fallow_report.mjs) ---

function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

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

function trendEmoji(direction) {
  switch (direction) {
    case 'improving':
      return '↑';
    case 'declining':
      return '↓';
    default:
      return '→';
  }
}

// --- Main ---

const args = process.argv.slice(2);
const jsonPath = args[0];
const ownersIdx = args.indexOf('--owners');
const targetOwners =
  ownersIdx !== -1
    ? args
        .slice(ownersIdx + 1)
        .filter((a) => !a.startsWith('--'))
        .map((o) => o.replace('@', ''))
    : [];
const channelIdx = args.indexOf('--channel');
const channel = channelIdx !== -1 ? args[channelIdx + 1] : '#search-code-quality-check-test';
const buildUrlIdx = args.indexOf('--build-url');
const buildUrl = buildUrlIdx !== -1 ? args[buildUrlIdx + 1] : '';

if (!jsonPath) {
  console.error(
    'Usage: node fallow_slack_notify.mjs <fallow.json> --owners @elastic/team1 --channel #channel --build-url <url>'
  );
  process.exit(1);
}

const token = process.env.SLACK_BOT_TOKEN;
if (!token) {
  console.error('SLACK_BOT_TOKEN is not set');
  process.exit(1);
}

const data = JSON.parse(readFileSync(jsonPath, 'utf8'));
const getOwnerForFile = createOwnerResolver(process.cwd());
const targetSet = new Set(targetOwners);

// Group findings by owner
const ownerData = new Map();

function addFinding(filePath, category, item) {
  const owner = getOwnerForFile(filePath);
  if (targetSet.size > 0 && !targetSet.has(owner)) return;
  if (!ownerData.has(owner)) {
    ownerData.set(owner, { complexityFindings: [], fileScores: [], hotspots: [] });
  }
  ownerData.get(owner)[category].push(item);
}

for (const f of data.findings ?? []) addFinding(f.path, 'complexityFindings', f);
for (const f of data.file_scores ?? []) addFinding(f.path, 'fileScores', f);
for (const f of data.hotspots ?? []) addFinding(f.path, 'hotspots', f);

const filteredOwners = targetOwners.length
  ? targetOwners.filter((o) => ownerData.has(o))
  : [...ownerData.keys()].sort();

// --- Build Slack blocks ---

const blocks = [];

// Header
blocks.push({
  type: 'header',
  text: { type: 'plain_text', text: '📊 Code Quality Report', emoji: true },
});

// Per-owner fields
const fields = filteredOwners.map((owner) => {
  const d = ownerData.get(owner);
  const score = computeHealthScore(d.fileScores, d.complexityFindings, d.hotspots);
  const grade = gradeFromScore(score);
  const emoji = gradeEmoji(grade);
  const density = avgComplexityDensity(d.fileScores);
  const critical = d.complexityFindings.filter((f) => f.severity === 'critical').length;
  const teamShort = owner.replace('elastic/', '');
  return {
    type: 'mrkdwn',
    text: `*${teamShort}*\n${emoji} ${grade} (${score.toFixed(1)}/100) · density ${density.toFixed(
      2
    )} · ${critical} critical`,
  };
});

if (fields.length > 0) {
  blocks.push({ type: 'section', fields });
}

// Trend section (global, from fallow's health_trend)
const trend = data.health_trend;
if (trend) {
  const prevDate = new Date(trend.previous_timestamp).toISOString().slice(0, 10);
  const overall = trendEmoji(trend.overall_direction);
  const direction = trend.overall_direction;

  // Pick most relevant metric deltas to show
  const metricsToShow = [
    'avg_cyclomatic',
    'critical_complexity_pct',
    'hotspot_count',
    'dead_file_pct',
  ];
  const deltaLines = metricsToShow
    .filter((k) => trend.metrics?.[k])
    .map((k) => {
      const m = trend.metrics[k];
      const arrow = trendEmoji(m.direction);
      const label = k.replace(/_/g, ' ');
      return `${arrow} ${label}: ${m.previous?.toFixed(2) ?? '?'} → ${
        m.current?.toFixed(2) ?? '?'
      }`;
    });

  const trendText =
    `${overall} *${direction}* vs ${prevDate}` +
    (deltaLines.length ? '\n' + deltaLines.join('  ·  ') : '');

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: trendText },
  });
}

// Footer with build link
const footerParts = ['_density = avg cyclomatic/LOC_'];
if (buildUrl) {
  footerParts.push(`<${buildUrl}|View build>`);
}
blocks.push({
  type: 'context',
  elements: [{ type: 'mrkdwn', text: footerParts.join('  ·  ') }],
});

// --- Send ---

const client = new WebClient(token);

try {
  await client.chat.postMessage({
    channel,
    text: `Code Quality Report — ${filteredOwners
      .map((o) => o.replace('elastic/', ''))
      .join(', ')}`,
    blocks,
  });
  console.log(`Slack message sent to ${channel}`);
} catch (err) {
  console.error('Failed to send Slack message:', err.message);
  process.exit(1);
}
