/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import {
  formatQuarantineMessage,
  isPathAllowed,
  loadQuarantineConfigs,
  matchQuarantinedPackage,
} from './load';

describe('matchQuarantinedPackage', () => {
  const packages = [
    { name: '@langchain/aws', reason: 'use wrapper', allowed: ['pkg/**'] },
    { name: '@kbn/langchain', reason: 'frozen', allowed: ['consumers/**'] },
  ];

  it('matches an exact package name', () => {
    expect(matchQuarantinedPackage('@langchain/aws', packages)?.name).toBe('@langchain/aws');
  });

  it('matches a subpath of a quarantined package', () => {
    expect(matchQuarantinedPackage('@kbn/langchain/server', packages)?.name).toBe('@kbn/langchain');
  });

  it('does not match an unrelated package', () => {
    expect(matchQuarantinedPackage('lodash', packages)).toBeUndefined();
    expect(matchQuarantinedPackage('@kbn/langchain-other', packages)).toBeUndefined();
  });
});

describe('isPathAllowed', () => {
  it('allows a file matching a glob', () => {
    expect(
      isPathAllowed('x-pack/platform/packages/shared/kbn-langchain/server/foo.ts', [
        'x-pack/platform/packages/shared/kbn-langchain/**',
      ])
    ).toBe(true);
  });

  it('rejects a file outside the globs', () => {
    expect(
      isPathAllowed('src/core/server/foo.ts', ['x-pack/platform/packages/shared/kbn-langchain/**'])
    ).toBe(false);
  });

  it('rejects every file when allowed is empty', () => {
    expect(isPathAllowed('x-pack/platform/packages/shared/kbn-langchain/foo.ts', [])).toBe(false);
  });
});

describe('loadQuarantineConfigs', () => {
  it('loads JSON configs from a directory', () => {
    const configs = loadQuarantineConfigs(Path.resolve(__dirname, '../__fixtures__/configs'));
    expect(configs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'fixture-dep',
          reason: 'test reason',
          allowed: ['allowed/**'],
        }),
      ])
    );
  });
});

describe('formatQuarantineMessage', () => {
  it('names the package, reason, and how to expand the allowlist', () => {
    const message = formatQuarantineMessage({
      name: '@langchain/aws',
      reason: 'Use @kbn/langchain wrappers instead.',
      allowed: ['x-pack/platform/packages/shared/kbn-langchain/**'],
    });
    expect(message).toContain('@langchain/aws');
    expect(message).toContain('Use @kbn/langchain wrappers instead.');
    expect(message).toContain('packages/kbn-dependency-quarantine/configs/');
    expect(message).toContain('@elastic/kibana-security');
  });
});
