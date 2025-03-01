/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getThemeTag, isThemeBundled } from './theme';

describe('getThemeTag', () => {
  it('returns the correct value for name:amsterdam and darkMode:false', () => {
    expect(
      getThemeTag({
        name: 'v8',
        darkMode: false,
      })
    ).toEqual('v8light');
  });

  it('returns the correct value for name:amsterdam and darkMode:true', () => {
    expect(
      getThemeTag({
        name: 'v8',
        darkMode: true,
      })
    ).toEqual('v8dark');
  });

  it('returns the correct value for other other theme names and darkMode:false', () => {
    expect(
      getThemeTag({
        name: 'borealis',
        darkMode: false,
      })
    ).toEqual('borealislight');
  });

  it('returns the correct value for other other theme names and darkMode:true', () => {
    expect(
      getThemeTag({
        name: 'borealis',
        darkMode: true,
      })
    ).toEqual('borealisdark');
  });
});

describe('isThemeBundled', () => {
  let originalKbnOptimizerThemes: any;

  beforeAll(() => {
    originalKbnOptimizerThemes = process.env.KBN_OPTIMIZER_THEMES;
  });

  afterAll(() => {
    process.env.KBN_OPTIMIZER_THEMES = originalKbnOptimizerThemes;
  });

  it('returns true when both light and dark mode theme tags are included in KBN_OPTIMIZER_THEMES', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8light,v8dark,borealislight,borealisdark';
    expect(isThemeBundled('amsterdam')).toEqual(true);
    expect(isThemeBundled('borealis')).toEqual(true);
  });

  it('returns false when either theme tag is missing in KBN_OPTIMIZER_THEMES for given theme name', () => {
    process.env.KBN_OPTIMIZER_THEMES = 'v8light,borealisdark,borealisdark';
    expect(isThemeBundled('amsterdam')).toEqual(false);
    expect(isThemeBundled('borealis')).toEqual(false);
  });

  it('uses default themes when KBN_OPTIMIZER_THEMES is not set', () => {
    delete process.env.KBN_OPTIMIZER_THEMES;
    expect(isThemeBundled('borealis')).toEqual(true);
    expect(isThemeBundled('sometheme' as any)).toEqual(false);

    process.env.KBN_OPTIMIZER_THEMES = '';
    expect(isThemeBundled('borealis')).toEqual(true);
    expect(isThemeBundled('sometheme' as any)).toEqual(false);
  });
});
