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

  it('selects stack baseline with minor version', () => {
    const selection = selectBaseline('stack', '8.15.2');

    expect(selection.distribution).toBe('stack');
    expect(selection.path).toContain('baselines/stack/8.15.yaml');
  });

  it('extracts minor version correctly from patch versions', () => {
    const selection1 = selectBaseline('stack', '8.15.0');
    const selection2 = selectBaseline('stack', '8.15.99');

    expect(selection1.path).toEqual(selection2.path);
    expect(selection1.path).toContain('8.15.yaml');
  });

  it('handles prerelease versions', () => {
    const selection = selectBaseline('stack', '9.0.0-alpha.1');

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
    expect(() => selectBaseline('stack', 'not-a-version')).toThrow('Invalid semver version');
  });
});
