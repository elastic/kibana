/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEscapeKey, isDeleteKey, isMeasureShortcut } from './keyboard_shortcuts';

describe('keyboard_shortcuts', () => {
  describe('isEscapeKey', () => {
    it('should return true for Escape key', () => {
      const event = { key: 'Escape' } as KeyboardEvent;
      expect(isEscapeKey(event)).toBe(true);
    });

    it('should return false for other keys', () => {
      const event = { key: 'Enter' } as KeyboardEvent;
      expect(isEscapeKey(event)).toBe(false);
    });
  });

  describe('isDeleteKey', () => {
    it('should return true for Delete key', () => {
      const event = { key: 'Delete' } as KeyboardEvent;
      expect(isDeleteKey(event)).toBe(true);
    });

    it('should return true for Backspace key', () => {
      const event = { key: 'Backspace' } as KeyboardEvent;
      expect(isDeleteKey(event)).toBe(true);
    });

    it('should return false for other keys', () => {
      const event = { key: 'Enter' } as KeyboardEvent;
      expect(isDeleteKey(event)).toBe(false);
    });
  });

  describe('isMeasureShortcut', () => {
    it('should return true for Meta + Period', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        code: 'Period',
        key: '.',
      } as KeyboardEvent;
      expect(isMeasureShortcut(event)).toBe(true);
    });

    it('should return true for Ctrl + Period', () => {
      const event = {
        metaKey: false,
        ctrlKey: true,
        code: 'Period',
        key: '.',
      } as KeyboardEvent;
      expect(isMeasureShortcut(event)).toBe(true);
    });

    it('should return true for Meta + dot key', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        code: '',
        key: '.',
      } as KeyboardEvent;
      expect(isMeasureShortcut(event)).toBe(true);
    });

    it('should return false without modifier key', () => {
      const event = {
        metaKey: false,
        ctrlKey: false,
        code: 'Period',
        key: '.',
      } as KeyboardEvent;
      expect(isMeasureShortcut(event)).toBe(false);
    });

    it('should return false for wrong key', () => {
      const event = {
        metaKey: true,
        ctrlKey: false,
        code: 'KeyA',
        key: 'a',
      } as KeyboardEvent;
      expect(isMeasureShortcut(event)).toBe(false);
    });
  });
});
