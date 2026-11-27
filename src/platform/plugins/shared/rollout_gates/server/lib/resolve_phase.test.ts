/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BuildIdentity } from './build_comparator';
import { resolvePhase } from './resolve_phase';

const build = (num: number): BuildIdentity => ({
  sha: `sha-${num}`,
  num,
  date: new Date(2024, 0, num).toISOString(),
});

describe('resolvePhase', () => {
  const genesisBuild = build(100);

  it('is staged on the build that introduces a gate after genesis', () => {
    expect(
      resolvePhase({
        isServerless: true,
        isRealBuild: true,
        currentBuild: build(101),
        introducingBuild: build(101),
        genesisBuild,
      })
    ).toBe('staged');
  });

  it('is finalized on the build after the one that introduced a gate', () => {
    expect(
      resolvePhase({
        isServerless: true,
        isRealBuild: true,
        currentBuild: build(102),
        introducingBuild: build(101),
        genesisBuild,
      })
    ).toBe('finalized');
  });

  it('reverts to staged after a rollback to the introducing build', () => {
    expect(
      resolvePhase({
        isServerless: true,
        isRealBuild: true,
        currentBuild: build(101),
        introducingBuild: build(101),
        genesisBuild,
      })
    ).toBe('staged');
  });

  it('is finalized for a gate introduced at or before the genesis build', () => {
    expect(
      resolvePhase({
        isServerless: true,
        isRealBuild: true,
        currentBuild: build(100),
        introducingBuild: build(100),
        genesisBuild,
      })
    ).toBe('finalized');
  });

  it('is finalized for a gate introduced before the genesis build', () => {
    expect(
      resolvePhase({
        isServerless: true,
        isRealBuild: true,
        currentBuild: build(100),
        introducingBuild: build(90),
        genesisBuild,
      })
    ).toBe('finalized');
  });

  it('is finalized outside serverless regardless of the introducing build', () => {
    expect(
      resolvePhase({
        isServerless: false,
        isRealBuild: true,
        currentBuild: build(101),
        introducingBuild: build(101),
        genesisBuild,
      })
    ).toBe('finalized');
  });

  it('is finalized when not running a real build (e.g. from source)', () => {
    expect(
      resolvePhase({
        isServerless: true,
        isRealBuild: false,
        currentBuild: build(101),
        introducingBuild: build(101),
        genesisBuild,
      })
    ).toBe('finalized');
  });
});
