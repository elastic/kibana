/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { selectBaseline } from './select_baseline';

describe('selectBaseline', () => {
  it('selects serverless current baseline', () => {
    const selection = selectBaseline('serverless');

    expect(selection.distribution).toBe('serverless');
    expect(selection.path).toContain('baselines/serverless/current.yaml');
  });

  it('selects stack baseline from previous minor version', () => {
    const selection = selectBaseline('stack', '8.15.2');

    expect(selection.distribution).toBe('stack');
    expect(selection.path).toContain('baselines/stack/8.14.yaml');
  });

  it('extracts previous minor version correctly from patch versions', () => {
    const selection1 = selectBaseline('stack', '8.15.0');
    const selection2 = selectBaseline('stack', '8.15.99');

    expect(selection1.path).toEqual(selection2.path);
    expect(selection1.path).toContain('8.14.yaml');
  });

  it('handles prerelease versions', () => {
    const selection = selectBaseline('stack', '9.1.0-alpha.1');

    expect(selection.path).toContain('baselines/stack/9.0.yaml');
  });

  it('handles SNAPSHOT suffix', () => {
    const selection = selectBaseline('stack', '9.2.0-SNAPSHOT');

    expect(selection.path).toContain('baselines/stack/9.1.yaml');
  });

  it('handles build metadata', () => {
    const selection = selectBaseline('stack', '9.2.0+build.123');

    expect(selection.path).toContain('baselines/stack/9.1.yaml');
  });

  it('handles complex pre-release versions', () => {
    const testCases = [
      { version: '9.2.0-beta.1', expected: '9.1' },
      { version: '9.3.0-rc.1', expected: '9.2' },
      { version: '9.4.0-alpha.1+build.456', expected: '9.3' },
      { version: '10.1.0-SNAPSHOT', expected: '10.0' },
    ];

    testCases.forEach(({ version, expected }) => {
      const selection = selectBaseline('stack', version);
      expect(selection.path).toContain(`baselines/stack/${expected}.yaml`);
    });
  });

  it('handles minor version 0 (uses 0 as baseline)', () => {
    const selection = selectBaseline('stack', '9.0.0');

    expect(selection.path).toContain('baselines/stack/9.0.yaml');
  });

  it('uses override path when provided', () => {
    const overridePath = '/custom/baseline.yaml';
    const selection = selectBaseline('stack', '8.15.0', overridePath);

    expect(selection.path).toBe(overridePath);
  });

  it('throws when version missing for stack', () => {
    expect(() => selectBaseline('stack')).toThrow('Version is required for stack baseline');
  });

  it('throws when version is invalid', () => {
    expect(() => selectBaseline('stack', 'not-a-version')).toThrow(
      'Invalid semver version: "not-a-version". Expected format: X.Y.Z'
    );
  });

  it('throws on completely non-semver input', () => {
    expect(() => selectBaseline('stack', 'invalid')).toThrow('Invalid semver version');
    expect(() => selectBaseline('stack', 'x.y.z')).toThrow('Invalid semver version');
  });
});
