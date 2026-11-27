/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSelectionModifier } from './selection_modifier';

let mockIsMac = false;
jest.mock('@kbn/shared-ux-utility', () => ({
  get isMac() {
    return mockIsMac;
  },
}));

const keys = (pressed: Partial<Parameters<typeof isSelectionModifier>[0]> = {}) => ({
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  ...pressed,
});

describe('isSelectionModifier', () => {
  describe.each([
    { platform: 'macOS', isMac: true, modifier: 'metaKey', otherPlatformModifier: 'ctrlKey' },
    {
      platform: 'other platforms',
      isMac: false,
      modifier: 'ctrlKey',
      otherPlatformModifier: 'metaKey',
    },
  ] as const)('on $platform', ({ isMac, modifier, otherPlatformModifier }) => {
    beforeEach(() => {
      mockIsMac = isMac;
    });

    it(`matches ${modifier} held alone`, () => {
      expect(isSelectionModifier(keys({ [modifier]: true }))).toBe(true);
    });

    it(`does not match ${otherPlatformModifier} held alone`, () => {
      expect(isSelectionModifier(keys({ [otherPlatformModifier]: true }))).toBe(false);
    });

    it.each(['shiftKey', 'altKey', otherPlatformModifier] as const)(
      `does not match ${modifier} combined with %s`,
      (extraModifier) => {
        expect(isSelectionModifier(keys({ [modifier]: true, [extraModifier]: true }))).toBe(false);
      }
    );
  });
});
