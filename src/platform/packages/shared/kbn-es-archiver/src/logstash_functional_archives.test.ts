/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { gunzipSync } from 'zlib';

import { REPO_ROOT } from '@kbn/repo-info';

/**
 * The `logstash_functional` ES archive is duplicated under several paths. They are
 * all indexed under the same index names (`logstash-2015.09.20/21/22`), and Scout's
 * `esArchiver` only exposes existence-keyed `loadIfNeeded`. If the copies diverge,
 * suites that share a cluster silently inherit whichever copy loaded first, causing
 * off-by-one counts and missing-field failures. This guard keeps the copies identical.
 */
const ARCHIVE_DIRS = [
  'src/platform/test/functional/fixtures/es_archiver/logstash_functional',
  'x-pack/platform/test/fixtures/es_archives/logstash_functional',
  'x-pack/platform/test/saved_object_tagging/common/fixtures/es_archiver/logstash_functional',
] as const;

const [CANONICAL_DIR, ...OTHER_DIRS] = ARCHIVE_DIRS;

const readMappings = (dir: string): string =>
  readFileSync(resolve(REPO_ROOT, dir, 'mappings.json'), 'utf8');

const readData = (dir: string): string =>
  gunzipSync(readFileSync(resolve(REPO_ROOT, dir, 'data.json.gz'))).toString('utf8');

const occurrences = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

describe('logstash_functional archive copies', () => {
  it('mappings.json is identical across every copy', () => {
    const base = readMappings(CANONICAL_DIR);
    for (const dir of OTHER_DIRS) {
      expect(readMappings(dir)).toStrictEqual(base);
    }
  });

  it('decompressed data.json.gz is identical across every copy', () => {
    const base = readData(CANONICAL_DIR);
    for (const dir of OTHER_DIRS) {
      expect(readData(dir)).toStrictEqual(base);
    }
  });

  it('preserves the canonical superset mapping and document set', () => {
    const mappings = readMappings(CANONICAL_DIR);
    const data = readData(CANONICAL_DIR);

    // one entry per daily index (3) for each superset field
    expect(occurrences(mappings, '"runtime_number"')).toBe(3);
    expect(occurrences(mappings, '"nestedField"')).toBe(3);
    expect(occurrences(mappings, '"ram_range"')).toBe(3);

    // canonical doc set: 14,004 docs, no scrubbed-agent sentinel
    expect(occurrences(data, '"type": "doc"')).toBe(14004);
    expect(data).not.toContain('Missing/Fields');
  });
});
