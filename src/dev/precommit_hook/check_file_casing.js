/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, join } from 'path';

import { createFailError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';

const EXCEPTIONS_JSON_PATH = join(REPO_ROOT, 'src/dev/precommit_hook/exceptions.json');
const CODEOWNERS_PATH = join(REPO_ROOT, '.github/CODEOWNERS');

const NO_OWNER_KEY = '_no_owner';

const NON_SNAKE_CASE_RE = /[A-Z \-]/;
const NON_KEBAB_CASE_RE = /[A-Z _]/;

function normalizePath(p) {
  return p.replace(/\\/g, '/');
}

/**
 * Converts exceptions from file format (compact: team -> { path -> expected }) to a flat array of { path, expected }.
 */
export function exceptionsToArray(data) {
  if (!data || typeof data !== 'object') return [];
  const out = [];
  for (const value of Object.values(data)) {
    if (value && typeof value === 'object') {
      for (const [path, expected] of Object.entries(value)) {
        out.push({ path: normalizePath(path), expected: expected ?? 'snake_case' });
      }
    }
  }
  return out;
}

function parseCodeowners() {
  const rules = [];
  if (!existsSync(CODEOWNERS_PATH)) return rules;
  const content = readFileSync(CODEOWNERS_PATH, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;
    const pathPattern = parts[0].replace(/^\/+/, '');
    const owners = parts.slice(1).filter((p) => p.startsWith('@'));
    if (owners.length) rules.push({ path: pathPattern, owners });
  }
  rules.sort((a, b) => b.path.length - a.path.length);
  return rules;
}

function findOwnersForPath(filePath, rules) {
  const norm = normalizePath(filePath);
  const match = rules.find((r) => norm === r.path || norm.startsWith(r.path + '/'));
  return match ? match.owners : [];
}

function listPaths(paths) {
  return paths.map((path) => ` - ${path}`).join('\n');
}

function isExempt(path, exceptionPaths) {
  const normalized = normalizePath(path);
  return exceptionPaths.some((e) => normalized === e || normalized.startsWith(e + '/'));
}

function getSegmentPaths(relativePath) {
  const normalized = normalizePath(relativePath);
  const parts = normalized.split('/').filter(Boolean);
  const segmentPaths = [];
  for (let i = 0; i < parts.length; i++) {
    segmentPaths.push(parts.slice(0, i + 1).join('/'));
  }
  return segmentPaths;
}

export async function checkFileCasing(log, files, options = {}) {
  const {
    packageRootDirs = new Set(),
    exceptions: rawExceptions = [],
    generateExceptions = false,
  } = options;

  const packageRootDirsSet = packageRootDirs instanceof Set ? packageRootDirs : new Set();
  const exceptionsList = exceptionsToArray(rawExceptions);
  const exceptionPaths = exceptionsList.map((e) => e.path);

  const violationsMap = new Map();

  for (const file of files) {
    const relativePath = file.getRelativePath();
    const path = normalizePath(relativePath);

    if (isExempt(path, exceptionPaths)) {
      log.debug('[casing] %j exempt', file);
      continue;
    }

    const segmentPaths = getSegmentPaths(path);
    for (let i = 0; i < segmentPaths.length; i++) {
      const segmentPath = segmentPaths[i];
      const segmentName = basename(segmentPath);
      const isPackageRoot = packageRootDirsSet.has(segmentPath);
      const expected = isPackageRoot ? 'kebab-case' : 'snake_case';
      const re = isPackageRoot ? NON_KEBAB_CASE_RE : NON_SNAKE_CASE_RE;
      const invalid = re.test(segmentName);

      if (invalid) {
        violationsMap.set(segmentPath, expected);
      }
    }
  }

  let violations = Array.from(violationsMap.entries()).map(([path, expected]) => ({
    path,
    expected,
  }));

  violations = violations.filter((v) => !isExempt(v.path, exceptionPaths));

  if (generateExceptions) {
    const codeownersRules = parseCodeowners();
    const byOwner = {};
    for (const v of violations) {
      const owners = findOwnersForPath(v.path, codeownersRules);
      const key = owners.length ? owners[0] : NO_OWNER_KEY;
      if (!byOwner[key]) byOwner[key] = {};
      byOwner[key][v.path] = v.expected;
    }

    const sortedOwnerKeys = Object.keys(byOwner).sort((a, b) => a.localeCompare(b));
    const output = {};
    for (const k of sortedOwnerKeys) {
      const pathMap = byOwner[k];
      const sortedPaths = Object.keys(pathMap).sort((a, b) => a.localeCompare(b));
      output[k] = {};
      for (const p of sortedPaths) output[k][p] = pathMap[p];
    }
    writeFileSync(EXCEPTIONS_JSON_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');
    log.info(`Wrote ${violations.length} exception(s) to ${EXCEPTIONS_JSON_PATH}`);
    return;
  }

  if (violations.length > 0) {
    const message =
      violations.length === 1
        ? `Path MUST use ${violations[0].expected}: ${violations[0].path}`
        : `Casing violations (path → expected):\n${listPaths(
            violations.map((v) => `${v.path} → ${v.expected}`)
          )}`;
    throw createFailError(message);
  }
}
