/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEscapeKey, isMeasureShortcut } from './keyboard_shortcut';

describe('keyboard_shortcut', () => {
  describe('isEscapeKey', () => {
    it('returns true for Escape key', () => {
      const event = { key: 'Escape' } as KeyboardEvent;
      expect(isEscapeKey(event)).toBe(true);
    });

    it('returns false for other keys', () => {
      const event = { key: 'Enter' } as KeyboardEvent;
      expect(isEscapeKey(event)).toBe(false);
    });
  });

  describe('isMeasureShortcut', () => {
    it('returns true for Meta + Period', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        code: 'Period',
        key: '.',
      } as KeyboardEvent;
      expect(isMeasureShortcut(event)).toBeTruthy();
    });

    it('returns true for Ctrl + Period', () => {
      const event = {
        metaKey: false,
        ctrlKey: true,
        code: 'Period',
        key: '.',
      } as KeyboardEvent;
      expect(isMeasureShortcut(event)).toBeTruthy();
    });

    it('returns true for Meta + dot key', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        code: '',
        key: '.',
      } as KeyboardEvent;
      expect(isMeasureShortcut(event)).toBeTruthy();
    });

    it('returns false without modifier key', () => {
      const event = {
        metaKey: false,
        ctrlKey: false,
        code: 'Period',
        key: '.',
      } as KeyboardEvent;
      expect(isMeasureShortcut(event)).toBeFalsy();
    });

    it('returns false for wrong key', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        code: 'KeyA',
        key: 'a',
      } as KeyboardEvent;
      expect(isMeasureShortcut(event)).toBeFalsy();
    });
  });
});
