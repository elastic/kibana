/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getThemeTag } from './get_theme_tag';

describe('getThemeTag', () => {
  it('returns the correct value for version:v8 and theme:light', () => {
    expect(
      getThemeTag({
        themeVersion: 'v8',
        theme: 'light',
      })
    ).toEqual('v8light');
  });
  it('returns the correct value for version:v8 and theme:dark', () => {
    expect(
      getThemeTag({
        themeVersion: 'v8',
        theme: 'dark',
      })
    ).toEqual('v8dark');
  });
  it('returns the correct value for version:v8 and theme:system', () => {
    expect(
      getThemeTag({
        themeVersion: 'v8',
        theme: 'system',
      })
    ).toEqual('system');
  });
});
