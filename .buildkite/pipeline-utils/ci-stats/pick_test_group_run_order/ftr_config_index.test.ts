/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { narrowFtrConfigsToChangedSpecs, type FtrConfigTestFilesIndex } from './ftr_config_index';

const CONFIG_A = 'x-pack/platform/test/api_integration/apis/foo/config.ts';
const CONFIG_B = 'x-pack/platform/test/api_integration/apis/bar/config.ts';

const SPEC_A1 = 'x-pack/platform/test/api_integration/apis/foo/a1.ts';
const SPEC_A2 = 'x-pack/platform/test/api_integration/apis/foo/a2.ts';
const SPEC_B1 = 'x-pack/platform/test/api_integration/apis/bar/b1.ts';
const SPEC_SHARED = 'x-pack/platform/test/api_integration/apis/shared/s1.ts';

const INDEX: FtrConfigTestFilesIndex = {
  configs: {
    [CONFIG_A]: [SPEC_A1, SPEC_A2, SPEC_SHARED],
    [CONFIG_B]: [SPEC_B1, SPEC_SHARED],
  },
  customRunners: [],
};

const SCHEDULED = [CONFIG_A, CONFIG_B];

describe('narrowFtrConfigsToChangedSpecs', () => {
  it('returns null (fail open) when there is no index', () => {
    expect(narrowFtrConfigsToChangedSpecs(SCHEDULED, [SPEC_A1], null)).toBeNull();
  });

  it('returns null (fail open) for an empty diff', () => {
    expect(narrowFtrConfigsToChangedSpecs(SCHEDULED, [], INDEX)).toBeNull();
  });

  it('narrows to the single owning config when one spec changed', () => {
    expect(narrowFtrConfigsToChangedSpecs(SCHEDULED, [SPEC_A1], INDEX)).toEqual([CONFIG_A]);
  });

  it('unions owning configs for a spec loaded by multiple configs', () => {
    expect(narrowFtrConfigsToChangedSpecs(SCHEDULED, [SPEC_SHARED], INDEX)).toEqual([
      CONFIG_A,
      CONFIG_B,
    ]);
  });

  it('unions owning configs across several changed specs', () => {
    expect(narrowFtrConfigsToChangedSpecs(SCHEDULED, [SPEC_A1, SPEC_B1], INDEX)).toEqual([
      CONFIG_A,
      CONFIG_B,
    ]);
  });

  it('intersects with the scheduled set (drops owning configs not scheduled)', () => {
    expect(narrowFtrConfigsToChangedSpecs([CONFIG_A], [SPEC_SHARED], INDEX)).toEqual([CONFIG_A]);
  });

  it('returns null (fail open) when any changed file is not a known spec', () => {
    expect(
      narrowFtrConfigsToChangedSpecs(
        SCHEDULED,
        [SPEC_A1, 'x-pack/platform/plugins/shared/foo/server/plugin.ts'],
        INDEX
      )
    ).toBeNull();
  });

  it('returns null (fail open) when a critical FTR path changed, even if the rest are specs', () => {
    expect(narrowFtrConfigsToChangedSpecs(SCHEDULED, [SPEC_A1, 'yarn.lock'], INDEX)).toBeNull();
  });

  it('returns an empty array when the owning config is not in the scheduled set', () => {
    // SPEC_B1 is owned only by CONFIG_B, which is not scheduled here.
    expect(narrowFtrConfigsToChangedSpecs([CONFIG_A], [SPEC_B1], INDEX)).toEqual([]);
  });
});
