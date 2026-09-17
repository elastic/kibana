/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Crypto from 'crypto';

// paths.mjs derives REPO_ROOT via import.meta, which jest's CJS transform
// cannot evaluate; scripts/jest runs from the repo root, so cwd is equivalent
jest.mock('../../lib/paths.mjs', () => ({ REPO_ROOT: process.cwd() }));

import {
  findSharedTarballs,
  isValid,
  mirrorFilename,
  parseRegistryUrl,
} from './prefetch_shared_tarballs.mjs';

const sha512 = (buffer) => `sha512-${Crypto.createHash('sha512').update(buffer).digest('base64')}`;

describe('isValid', () => {
  const content = Buffer.from('tarball bytes');

  it('accepts a buffer matching the recorded sha512', () => {
    expect(isValid(content, sha512(content))).toBe(true);
  });

  it('rejects a zero-byte buffer against a real integrity value', () => {
    // the literal CI failure state: yarn hashed an empty stream
    expect(isValid(Buffer.alloc(0), sha512(content))).toBe(false);
  });

  it('rejects a buffer with different content', () => {
    expect(isValid(Buffer.from('corrupted'), sha512(content))).toBe(false);
  });

  it('skips unsupported algorithms in multi-entry integrity strings', () => {
    expect(isValid(content, `unsupported-abc123 ${sha512(content)}`)).toBe(true);
  });

  it('rejects unsupported or malformed integrity strings', () => {
    expect(isValid(content, 'not-an-integrity')).toBe(false);
    expect(isValid(content, '')).toBe(false);
  });
});

describe('parseRegistryUrl', () => {
  it('parses plain package tarball urls', () => {
    expect(
      parseRegistryUrl('https://registry.npmjs.org/redux-thunk/-/redux-thunk-2.4.2.tgz')
    ).toEqual({ name: 'redux-thunk', version: '2.4.2' });
  });

  it('parses scoped package tarball urls', () => {
    expect(
      parseRegistryUrl(
        'https://registry.yarnpkg.com/@elastic/kibana-d3-color/-/kibana-d3-color-2.0.1.tgz'
      )
    ).toEqual({ name: '@elastic/kibana-d3-color', version: '2.0.1' });
  });

  it('parses prerelease versions', () => {
    expect(parseRegistryUrl('https://registry.npmjs.org/foo/-/foo-1.0.0-beta.1.tgz')).toEqual({
      name: 'foo',
      version: '1.0.0-beta.1',
    });
  });

  it('returns undefined for non-registry-shaped urls', () => {
    expect(parseRegistryUrl('https://example.com/some/archive.tgz')).toBe(undefined);
  });
});

describe('mirrorFilename', () => {
  it('joins name and version', () => {
    expect(mirrorFilename({ name: 'redux-thunk', version: '2.4.2' })).toBe('redux-thunk-2.4.2.tgz');
  });

  it('replaces the scope separator like yarn classic does', () => {
    expect(mirrorFilename({ name: '@elastic/kibana-d3-color', version: '2.0.1' })).toBe(
      '@elastic-kibana-d3-color-2.0.1.tgz'
    );
  });
});

describe('findSharedTarballs', () => {
  const entry = (selector, url, integrity) =>
    [
      `${selector}:`,
      '  version "0.0.0"',
      `  resolved "${url}#abc123"`,
      `  integrity ${integrity}`,
    ].join('\n');

  it('returns only tarballs referenced by more than one lockfile entry', async () => {
    const sharedUrl = 'https://registry.yarnpkg.com/redux-thunk/-/redux-thunk-2.4.2.tgz';
    const lock = [
      entry('redux-thunk@^2.4.2', sharedUrl, 'sha512-shared'),
      entry('redux-thunk-v2@npm:redux-thunk@2.4.2', sharedUrl, 'sha512-shared'),
      entry(
        'lodash@^4.17.21',
        'https://registry.yarnpkg.com/lodash/-/lodash-4.17.21.tgz',
        'sha512-solo'
      ),
    ].join('\n\n');

    expect(await findSharedTarballs(lock)).toEqual([
      {
        url: sharedUrl,
        integrity: 'sha512-shared',
        name: 'redux-thunk',
        version: '2.4.2',
      },
    ]);
  });

  it('handles scoped packages', async () => {
    const url = 'https://registry.yarnpkg.com/@elastic/kibana-d3-color/-/kibana-d3-color-2.0.1.tgz';
    const lock = [
      entry('@elastic/kibana-d3-color@2.0.1', url, 'sha512-x'),
      entry('d3-color@npm:@elastic/kibana-d3-color@2.0.1', url, 'sha512-x'),
    ].join('\n\n');

    expect(await findSharedTarballs(lock)).toEqual([
      { url, integrity: 'sha512-x', name: '@elastic/kibana-d3-color', version: '2.0.1' },
    ]);
  });

  it('ignores blocks without resolved/integrity fields', async () => {
    expect(await findSharedTarballs('# yarn lockfile v1\n\nsome-comment')).toEqual([]);
  });

  it('detects the known alias pairs in the real repo yarn.lock', async () => {
    const names = (await findSharedTarballs()).map((t) => t.name);
    expect(names).toEqual(expect.arrayContaining(['redux-thunk', 'redux', 'immer', 'reselect']));
  });
});
