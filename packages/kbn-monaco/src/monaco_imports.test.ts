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
  it('has the property registerLanguageThemeResolver defined', () => {
    expect(monaco.editor).toHaveProperty('registerLanguageThemeResolver', expect.any(Function));
  });

  it('has the property getLanguageThemeResolver defined', () => {
    expect(monaco.editor).toHaveProperty('getLanguageThemeResolver', expect.any(Function));
  });

  it('registers a theme resolver to a specific ID and returns the same registered theme resolver using the same ID', () => {
    const themeResolver = jest.fn();
    monaco.editor.registerLanguageThemeResolver('test', themeResolver);
    expect(monaco.editor.getLanguageThemeResolver('test')).toBe(themeResolver);
  });
});
