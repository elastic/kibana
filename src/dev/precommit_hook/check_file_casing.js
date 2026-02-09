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

const NON_SNAKE_CASE_RE = /[A-Z \-]/;
const NON_KEBAB_CASE_RE = /[A-Z _]/;

function normalizePath(p) {
  return p.replace(/\\/g, '/');
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
  const exceptionPaths = Array.isArray(rawExceptions)
    ? rawExceptions.map((e) => (typeof e === 'string' ? e : normalizePath(e.path ?? e)))
    : [];

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

  if (generateExceptions && violations.length > 0) {
    const existing = existsSync(EXCEPTIONS_JSON_PATH)
      ? JSON.parse(readFileSync(EXCEPTIONS_JSON_PATH, 'utf8'))
      : [];
    const existingPaths = new Set((Array.isArray(existing) ? existing : []).map((e) => e.path));
    const merged = [...(Array.isArray(existing) ? existing : [])];
    for (const v of violations) {
      if (!existingPaths.has(v.path)) {
        merged.push(v);
        existingPaths.add(v.path);
      }
    }
    merged.sort((a, b) => a.path.localeCompare(b.path));
    writeFileSync(EXCEPTIONS_JSON_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf8');
    log.info(`Wrote ${violations.length} new exception(s) to ${EXCEPTIONS_JSON_PATH}`);
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
