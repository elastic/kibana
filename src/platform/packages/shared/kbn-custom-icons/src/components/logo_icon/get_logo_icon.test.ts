/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getLogoIcon, LOGO_NAMES } from './get_logo_icon';

describe('getLogoIcon', () => {
  it('returns the default icon when logoName is undefined', () => {
    expect(getLogoIcon(undefined)).toBeDefined();
  });

  it('defaults isDarkMode to false', () => {
    expect(getLogoIcon('openAi')).toBeDefined();
  });

  LOGO_NAMES.forEach((logoName) => {
    describe(`with ${logoName}`, () => {
      it('returns an icon in light mode', () => {
        expect(getLogoIcon(logoName, false)).toBeDefined();
      });

      it('returns an icon in dark mode', () => {
        expect(getLogoIcon(logoName, true)).toBeDefined();
      });
    });
  });
});
