/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { open as lmdbOpen, type RootDatabase } from 'lmdb';

import { run, type RunOptions } from '@kbn/dev-cli-runner';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ToolingLog } from '@kbn/tooling-log';
import type { CacheEntry } from './types';

const runOptions: RunOptions = {
  description: 'Inspect LMDB babel-register cache entries',
  flags: {
    string: ['count'],
    help: `
      --count            Number of entries to inspect (default=3)
    `,
  },
  log: {
    context: 'inspect-lmdb-entry',
    defaultLevel: 'info',
  },
};

/**
 * Inspect LMDB babel-register cache entries
 *
 * This displays detailed information about LMDB cache entries
 * to help debug and understand the cache structure.
 */
export function inspectLmdbEntry(): void {
  void run(async ({ log, flagsReader }) => {
    await inspectLmdbEntryWithLog(log, parseInt(flagsReader.string('count') ?? '3', 10));
  }, runOptions);
}

async function inspectLmdbEntryWithLog(log: ToolingLog, maxCount: number): Promise<void> {
  const dataDir = Path.join(REPO_ROOT, 'data', 'babel_register_cache', 'main');
  const dbPath = Path.join(dataDir, 'v6');

  log.info(`Reading LMDB database from: ${dbPath}`);

  const db: RootDatabase<CacheEntry, string> = lmdbOpen({
    path: dbPath,
    name: 'db',
    encoding: 'json',
    readOnly: true,
    noSubdir: false,
  });

  let count = 0;
  for (const { key, value } of db.getRange()) {
    if (key === '@last clean') {
      continue;
    }

    // Show entry details
    if (count === 0) {
      log.write('');
      log.write('=== LMDB Entry Example ===');
      log.write('');
    }

    log.write(`--- Entry ${count + 1} ---`);
    log.info(`Key: ${key.substring(0, 100)}${key.length > 100 ? '...' : ''}`);
    log.write('');
    log.write('Value structure:');

    // CacheEntry is [atime, path, code, sourceMap]
    const atime = value[0];
    const filePath = value[1];
    const code = value[2];
    const sourceMap = value[3];

    log.info(`  [0] atime: ${atime} (${new Date(atime).toISOString()})`);
    log.info(`  [1] path: ${filePath || 'not present'}`);
    log.info(`  [2] code length: ${code?.length || 0} characters`);
    log.info(`  [3] source map: ${sourceMap ? 'present' : 'missing'}`);

    if (sourceMap && typeof sourceMap === 'object') {
      log.write('');
      log.write('=== Source Map Contents ===');
      log.info(`  version: ${(sourceMap as any).version}`);

      const sources = (sourceMap as any).sources;

      if (Array.isArray(sources)) {
        log.info(`  sources: [${sources.length} files]`);
        sources.slice(0, 3).forEach((source: string, idx: number) => {
          log.info(`    [${idx}] ${source}`);
        });
        if (sources.length > 3) {
          log.info(`    ... and ${sources.length - 3} more`);
        }
      }

      const sourcesContent = (sourceMap as any).sourcesContent;

      if (Array.isArray(sourcesContent)) {
        log.info(
          `  sourcesContent: ${sourcesContent.length} file${sourcesContent.length !== 1 ? 's' : ''}`
        );
      } else {
        log.info(`  sourcesContent: not present`);
      }

      const names = (sourceMap as any).names;

      if (Array.isArray(names)) {
        log.info(`  names (total): ${names.length}`);

        if (names.length > 0) {
          const preview = names.slice(0, 20).join(', ');
          log.info(`  names (first 20): ${preview}${names.length > 20 ? ', ...' : ''}`);
        }
      }

      const mappings = (sourceMap as any).mappings;

      log.info(`  mappings (length): ${mappings?.length || 0} characters`);
      log.info(`  file: ${(sourceMap as any).file || 'not present'}`);
      log.write('');
      log.write('=== Path Analysis ===');

      if (filePath) {
        log.info(`  Cached file path: ${filePath}`);
      }

      if ((sourceMap as any).file) {
        log.info(`  Source map file: ${(sourceMap as any).file}`);
      }

      if (Array.isArray(sources) && sources.length > 0) {
        log.info(`  Source map sources[0]: ${sources[0]}`);
      }

      log.info(`  Key prefix: ${key.substring(0, 50)}${key.length > 50 ? '...' : ''}`);
    }

    log.write('');

    count++;

    if (count >= maxCount) {
      break;
    }
  }

  if (count === 0) {
    log.warning('No entries found in LMDB cache');
  } else {
    log.success(`Inspected ${count} entr${count !== 1 ? 'ies' : 'y'}`);
  }

  db.close();
}
