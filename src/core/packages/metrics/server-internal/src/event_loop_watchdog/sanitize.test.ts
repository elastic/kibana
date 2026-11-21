/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  capLocation,
  capName,
  MAX_LOCATION_LENGTH,
  MAX_NAME_LENGTH,
  relativeLocation,
} from './sanitize';

describe('capName', () => {
  it('keeps names up to MAX_NAME_LENGTH characters and cuts longer ones from the end', () => {
    expect(capName('handler')).toBe('handler');
    const long = 'a'.repeat(MAX_NAME_LENGTH) + 'dropped';
    expect(capName(long)).toBe('a'.repeat(MAX_NAME_LENGTH));
  });
});

describe('capLocation', () => {
  it('keeps the end of a long location with a leading ellipsis, at MAX_LOCATION_LENGTH characters', () => {
    const deep = `src/${'very_long_segment/'.repeat(10)}leaf_file.ts:42`;
    const location = capLocation(deep);
    expect(location).toHaveLength(MAX_LOCATION_LENGTH);
    expect(location.startsWith('...')).toBe(true);
    expect(location.endsWith('/leaf_file.ts:42')).toBe(true);
  });

  it('leaves short locations unchanged', () => {
    expect(capLocation('src/a.ts:3')).toBe('src/a.ts:3');
  });
});

describe('relativeLocation', () => {
  const ROOT = '/kibana';

  it('converts a file:// URL under the root into a repo-relative path', () => {
    expect(relativeLocation('file:///kibana/src/core/server.ts', ROOT)).toBe('src/core/server.ts');
    expect(relativeLocation('file:///kibana/src/core/server.ts', `${ROOT}/`)).toBe(
      'src/core/server.ts'
    );
  });

  it('decodes percent-encoded file:// paths so roots and paths with spaces or non-ASCII match', () => {
    expect(
      relativeLocation(
        'file:///Users/dev/My%20Projects/kibana/src/a%20b.ts',
        '/Users/dev/My Projects/kibana'
      )
    ).toBe('src/a b.ts');
  });

  it('drops query strings and hash fragments from file:// URLs', () => {
    expect(relativeLocation('file:///kibana/src/a.ts?foo=1#bar', ROOT)).toBe('src/a.ts');
  });

  it('keeps node: specifiers', () => {
    expect(relativeLocation('node:internal/process/task_queues', ROOT)).toBe(
      'node:internal/process/task_queues'
    );
  });

  it('reduces paths outside the root to their file name', () => {
    expect(relativeLocation('file:///home/user/secret/b.js', ROOT)).toBe('b.js');
    expect(relativeLocation('/home/user/secret/b.js', ROOT)).toBe('b.js');
  });

  it('returns undefined for an empty URL', () => {
    expect(relativeLocation('', ROOT)).toBeUndefined();
  });
});
