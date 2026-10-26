/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isTemplateExpression } from './templates';

describe('isTemplateExpression', () => {
  it('returns true for a valid template expression', () => {
    expect(isTemplateExpression('{{ steps.step1.output }}')).toBe(true);
  });

  it('returns true for minimal template', () => {
    expect(isTemplateExpression('{{x}}')).toBe(true);
  });

  it('returns false for plain string', () => {
    expect(isTemplateExpression('hello world')).toBe(false);
  });

  it('returns false for non-string values', () => {
    expect(isTemplateExpression(42)).toBe(false);
    expect(isTemplateExpression(null)).toBe(false);
    expect(isTemplateExpression(undefined)).toBe(false);
  });

  it('returns false for partial template expressions', () => {
    expect(isTemplateExpression('{{ missing end')).toBe(false);
    expect(isTemplateExpression('missing start }}')).toBe(false);
  });
});
