/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { monaco } from './monaco_imports';

describe('monaco augmentation', () => {
  describe('getLanguageThemeResolver', () => {
    it('has the property getLanguageThemeResolver defined', () => {
      expect(monaco.editor).toHaveProperty('getLanguageThemeResolver', expect.any(Function));
    });
  });

  describe('registerLanguageThemeResolver', () => {
    it('has the property registerLanguageThemeResolver defined', () => {
      expect(monaco.editor).toHaveProperty('registerLanguageThemeResolver', expect.any(Function));
    });

    it('registers a theme resolver to a specific ID and returns the same registered theme resolver using the same ID', () => {
      const themeResolver = jest.fn();
      monaco.editor.registerLanguageThemeResolver('test', themeResolver);
      expect(monaco.editor.getLanguageThemeResolver('test')).toBe(themeResolver);
    });

    it('throws an error when attempting to register a different theme resolver if one exists for the specified theme ID', () => {
      expect(() => monaco.editor.registerLanguageThemeResolver('test', jest.fn())).toThrow();
    });

    it('allows registering a different theme resolver for a theme ID with existing resolver definition by specifying the override flag', () => {
      const alternateThemeResolver = jest.fn();
      monaco.editor.registerLanguageThemeResolver('test', alternateThemeResolver, true);
      expect(monaco.editor.getLanguageThemeResolver('test')).toBe(alternateThemeResolver);
    });
  });
});
