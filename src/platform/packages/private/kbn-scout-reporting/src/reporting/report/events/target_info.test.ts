/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildScoutTargetInfo } from './target_info';

// The location/arch/domain env vars are read once at module load, so only the attributes can
// be varied from here. That is the part these tests are about.
describe('buildScoutTargetInfo', () => {
  const originalTargetAttributes = process.env.SCOUT_TARGET_ATTRIBUTES;

  afterEach(() => {
    if (originalTargetAttributes === undefined) {
      delete process.env.SCOUT_TARGET_ATTRIBUTES;
    } else {
      process.env.SCOUT_TARGET_ATTRIBUTES = originalTargetAttributes;
    }
  });

  it('records the attributes declared via SCOUT_TARGET_ATTRIBUTES', () => {
    process.env.SCOUT_TARGET_ATTRIBUTES = 'fips';

    expect(buildScoutTargetInfo().attributes).toEqual(['fips']);
  });

  it('records no attributes when none are declared', () => {
    delete process.env.SCOUT_TARGET_ATTRIBUTES;

    expect(buildScoutTargetInfo().attributes).toEqual([]);
  });

  it('reads the attributes per call, not once at module load', () => {
    delete process.env.SCOUT_TARGET_ATTRIBUTES;
    expect(buildScoutTargetInfo().attributes).toEqual([]);

    process.env.SCOUT_TARGET_ATTRIBUTES = 'fips';
    expect(buildScoutTargetInfo().attributes).toEqual(['fips']);
  });

  it('falls back to the given location when no test target is declared', () => {
    expect(buildScoutTargetInfo().type).toBe('local');
    expect(buildScoutTargetInfo('unknown').type).toBe('unknown');
    expect(buildScoutTargetInfo().mode).toBe('unknown');
  });
});
