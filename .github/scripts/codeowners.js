/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Same gitignore-semantics matcher as @kbn/code-owners.
const ignore = require('ignore');

/**
 * Parse CODEOWNERS into per-line `ignore` matchers, reversed so the last
 * matching line wins (GitHub's precedence rule), mirroring @kbn/code-owners.
 */
function buildCodeownersEntries(contents) {
  const entries = [];
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }
    // Backport branches override ownership with `* @kibanamachine`; ignore it.
    if (/^\*\s+@kibanamachine$/.test(line)) {
      continue;
    }
    const [pattern, ...owners] = line.replace(/#.*$/, '').trim().split(/\s+/);
    if (!pattern) {
      continue;
    }
    entries.push({
      owners: owners.filter((o) => o.startsWith('@')),
      matcher: ignore().add(pattern.replace(/\/$/, '')),
    });
  }
  return entries.reverse();
}

/** Owners of the last CODEOWNERS line matching `file`; empty when unowned. */
function findOwners(entries, file) {
  const normalized = file.replace(/^\/+/, '');
  const match = entries.find((entry) => entry.matcher.test(normalized).ignored);
  return match ? match.owners : [];
}

/** Union of owners across `files`, in first-seen order. */
function resolveOwners(entries, files) {
  const owners = new Set();
  for (const file of files) {
    findOwners(entries, file).forEach((o) => owners.add(o));
  }
  return [...owners];
}

module.exports = { buildCodeownersEntries, findOwners, resolveOwners };
