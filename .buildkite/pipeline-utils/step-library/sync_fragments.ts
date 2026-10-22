/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Keeps the `pull_request/` entries of `FRAGMENTS` in step with the YAML files on disk, so that a
// fragment added or deleted elsewhere does not need a manual edit to `fragments.ts`. Only plain,
// unported `yamlFragment(...)` entries are added or removed; ported entries are left alone. The
// snapshots of removed entries are pruned too, because Jest fails on an obsolete snapshot unless
// it runs with `-u`, which would also rewrite the snapshots of surviving fragments.

import fs from 'fs';
import path from 'path';

const PREFIX = 'pull_request/';
const ARRAY_START = 'export const FRAGMENTS: readonly Fragment[] = [';
const NAME = /yamlFragment\('([^']+)'\)/;
const PLAIN_ENTRY = /^ {2}yamlFragment\('([^']+)'\),$/;

export const listPullRequestYamlNames = (root: string): string[] =>
  fs
    .readdirSync(path.join(root, '.buildkite/pipelines', PREFIX), {
      recursive: true,
      encoding: 'utf8',
    })
    .filter((file) => file.endsWith('.yml'))
    .map((file) => `${PREFIX}${file.slice(0, -'.yml'.length)}`);

const nameOf = (line: string): string => {
  const [, name] = NAME.exec(line) ?? [];
  if (!name) {
    throw new Error(`Cannot sync FRAGMENTS: unrecognized entry on one line: ${line}`);
  }
  return name;
};

export const syncFragmentRegistry = (
  source: string,
  onDisk: readonly string[]
): { source: string; removed: string[] } => {
  const lines = source.split('\n');
  const start = lines.indexOf(ARRAY_START) + 1;
  const end = lines.indexOf('];', start);
  if (start === 0 || end === -1) {
    throw new Error('Cannot sync FRAGMENTS: the array was not found in fragments.ts');
  }

  const onDiskNames = new Set(onDisk);
  const removed: string[] = [];
  const kept = lines.slice(start, end).filter((line) => {
    const [, plainName] = PLAIN_ENTRY.exec(line) ?? [];
    if (!plainName?.startsWith(PREFIX) || onDiskNames.has(plainName)) return true;
    removed.push(plainName);
    return false;
  });
  const registered = new Set(kept.map(nameOf));
  const added = onDisk
    .filter((name) => !registered.has(name))
    .map((name) => `  yamlFragment('${name}'),`);
  const entries = [...kept, ...added].sort((a, b) => (nameOf(a) < nameOf(b) ? -1 : 1));

  return {
    source: [...lines.slice(0, start), ...entries, ...lines.slice(end)].join('\n'),
    removed,
  };
};

// Drops the snapshot entries of the named fragments and leaves every other entry byte-for-byte as
// Jest wrote it. Entries are separated by a blank line and each starts with `exports[`.
export const pruneFragmentSnapshots = (snapshot: string, removed: readonly string[]): string => {
  const keys = new Set(removed.map((name) => `exports[\`pull_request fragments ${name} 1\`] = \``));

  return snapshot
    .split(/\n\n(?=exports\[`)/)
    .filter((entry) => !keys.has(entry.split('\n', 1)[0]))
    .join('\n\n');
};
