/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { clearDocumentationDirectives } from './docs';

describe('clearDocumentationDirectives', () => {
  it('should remove lowercase MyST directives', () => {
    const input = 'Documentation.{applies_to}`stack: preview 9.4`';
    const expected = 'Documentation.';
    expect(clearDocumentationDirectives(input)).toBe(expected);
  });

  it('should remove uppercase MyST directives', () => {
    const input = 'Documentation.{APPLIES_TO}`stack: preview 9.4`';
    const expected = 'Documentation.';
    expect(clearDocumentationDirectives(input)).toBe(expected);
  });

  it('should remove multiple directives', () => {
    const input = 'Documentation.{APPLIES_TO}`stack: preview 9.4`{OTHER_DIRECTIVE}`other content`';
    const expected = 'Documentation.';
    expect(clearDocumentationDirectives(input)).toBe(expected);
  });
});
