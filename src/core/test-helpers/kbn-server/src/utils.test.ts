/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { nextMinorOf, previousMinorOf, resolveKibanaVersion } from './utils';

describe('nextMinorOf', () => {
  it('increments the minor version for a plain semver string', () => {
    expect(nextMinorOf('9.4.0')).toBe('9.5.0');
    expect(nextMinorOf('8.18.3')).toBe('8.19.0');
    expect(nextMinorOf('1.0.0')).toBe('1.1.0');
  });

  it('increments the minor version and ignores the pre-release tag', () => {
    // semver.inc('9.4.0-SNAPSHOT', 'minor') returns '9.4.0' (the release after
    // the pre-release), not '9.5.0'. We must produce '9.5.0' so that the computed
    // Kibana version genuinely differs from the running ES version.
    expect(nextMinorOf('9.4.0-SNAPSHOT')).toBe('9.5.0');
    expect(nextMinorOf('8.18.0-SNAPSHOT')).toBe('8.19.0');
  });

  it('throws for invalid version strings', () => {
    expect(() => nextMinorOf('not-a-version')).toThrow(
      'Failed to compute next minor version for not-a-version'
    );
  });
});

describe('previousMinorOf', () => {
  it('decrements the minor version for a plain semver string', () => {
    expect(previousMinorOf('9.4.0')).toBe('9.3.0');
    expect(previousMinorOf('8.18.3')).toBe('8.17.0');
  });

  it('returns the same version when minor is already 0', () => {
    expect(previousMinorOf('9.0.0')).toBe('9.0.0');
    expect(previousMinorOf('9.0.0-SNAPSHOT')).toBe('9.0.0-SNAPSHOT');
  });
});

describe('resolveKibanaVersion', () => {
  it('returns undefined when customKibanaVersion is undefined', () => {
    expect(resolveKibanaVersion(undefined, '9.4.0')).toBeUndefined();
  });

  it("resolves 'nextMinor' relative to the ES version", () => {
    expect(resolveKibanaVersion('nextMinor', '9.4.0')).toBe('9.5.0');
    expect(resolveKibanaVersion('nextMinor', '9.4.0-SNAPSHOT')).toBe('9.5.0');
  });

  it("resolves 'previousMinor' relative to the ES version", () => {
    expect(resolveKibanaVersion('previousMinor', '9.4.0')).toBe('9.3.0');
    expect(resolveKibanaVersion('previousMinor', '9.0.0')).toBe('9.0.0');
  });

  it('passes through valid semver strings unchanged', () => {
    expect(resolveKibanaVersion('10.0.0', '9.4.0')).toBe('10.0.0');
  });

  it('throws for unrecognised non-semver strings', () => {
    expect(() => resolveKibanaVersion('badToken', '9.4.0')).toThrow(
      'Invalid customKibanaVersion: "badToken"'
    );
  });
});
