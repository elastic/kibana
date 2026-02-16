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
import { uniq } from 'lodash';
import { File } from '../file';

const EXCEPTIONS_JSON_PATH = join(REPO_ROOT, 'src/dev/precommit_hook/exceptions.json');
const CODEOWNERS_PATH = join(REPO_ROOT, '.github/CODEOWNERS');
const NO_OWNER_KEY = '_no_owner';
const NON_SNAKE_CASE_RE = /[A-Z \-]/;
const NON_KEBAB_CASE_RE = /[A-Z \_]/;

function normalizePath(p) {
  return p.replace(/\\/g, '/');
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

function getSegmentPaths(relativePath) {
  const normalized = normalizePath(relativePath);
  const parts = normalized.split('/').filter(Boolean);
  const segmentPaths = [];
  for (let i = 0; i < parts.length; i++) {
    segmentPaths.push(parts.slice(0, i + 1).join('/'));
  }
  return segmentPaths;
}

export async function checkFileCasing(log, paths, getExpectedCasing, options = {}) {
  const { exceptions = [], generateExceptions = false, packageRootDirs } = options;

  const violations = [];

  const pathsToValidate = uniq(
    paths
      .map((path) => (path instanceof File ? path : new File(path)))
      .map((file) => normalizePath(file.getRelativePath()))
      .flatMap((path) => getSegmentPaths(path))
      .filter((path) => generateExceptions || !exceptions.includes(path))
  );

  pathsToValidate.forEach((path) => {
    const resourceName = basename(path);
    const expectedCasing = getExpectedCasing(path, packageRootDirs);

    switch (expectedCasing) {
      case 'kebab-case':
        if (NON_KEBAB_CASE_RE.test(resourceName)) {
          violations.push({ path, expected: `'${resourceName}' should be kebab-case` });
        }
        break;
      case 'snake_case':
        if (NON_SNAKE_CASE_RE.test(resourceName)) {
          violations.push({ path, expected: `'${resourceName}' should be snake_case` });
        }
        break;
      default:
        throw new Error(`Unable to verify '${expectedCasing}' casing`);
    }
  });

  if (generateExceptions) {
    const codeownersRules = parseCodeowners();
    const byOwner = {};
    violations.forEach(({ path, expected }) => {
      const owners = findOwnersForPath(path, codeownersRules);
      const key = owners.length ? owners[0] : NO_OWNER_KEY;
      if (!byOwner[key]) byOwner[key] = {};
      byOwner[key][path] = expected;
    });

    const sortedOwnerKeys = Object.keys(byOwner).sort((a, b) => a.localeCompare(b));
    const output = {};
    sortedOwnerKeys.forEach((k) => {
      const pathMap = byOwner[k];
      const sortedPaths = Object.keys(pathMap).sort((a, b) => a.localeCompare(b));
      output[k] = {};
      for (const p of sortedPaths) output[k][p] = pathMap[p];
    });

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
