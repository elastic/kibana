/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isTemplateReference } from './is_template_reference';

describe('isTemplateReference', () => {
  describe('returns true for valid template references', () => {
    it.each([
      ['${{ steps.myStep.output }}', 'dollar-curly variable reference'],
      ['${{ env.MY_VAR }}', 'dollar-curly env reference'],
      ['{{ variable }}', 'Liquid output tag'],
      ['{{ steps.myStep.output | json }}', 'Liquid output with filter'],
      ['${{value}}', 'dollar-curly without spaces'],
      ['{{value}}', 'Liquid output without spaces'],
      ['${{}}', 'dollar-curly with empty content'],
      ['{{}}', 'Liquid with empty content'],
    ])('%s (%s)', (value) => {
      expect(isTemplateReference(value)).toBe(true);
    });
  });

  describe('returns true with leading/trailing whitespace', () => {
    it.each([
      ['  ${{ foo }}  ', 'dollar-curly with spaces'],
      ['  {{ bar }}  ', 'Liquid output with spaces'],
      ['\t${{ baz }}\t', 'dollar-curly with tabs'],
      ['\n{{ qux }}\n', 'Liquid output with newlines'],
    ])('%s (%s)', (value) => {
      expect(isTemplateReference(value)).toBe(true);
    });
  });

  describe('returns false for non-template strings', () => {
    it.each([
      ['plain text', 'plain string'],
      ['${ not a template }', 'single curly dollar'],
      ['{ also not }', 'single curly braces'],
      ['${{ missing end', 'unclosed dollar-curly'],
      ['{{ missing end', 'unclosed Liquid output'],
      ['missing start }}', 'no opening braces'],
      ['some ${{ embedded }} text', 'template embedded in text'],
      ['', 'empty string'],
    ])('%s (%s)', (value) => {
      expect(isTemplateReference(value)).toBe(false);
    });
  });

  describe('returns false for null and undefined', () => {
    it('returns false for null', () => {
      expect(isTemplateReference(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isTemplateReference(undefined)).toBe(false);
    });
  });

  it('distinguishes ${{ }} from {{ }} (both are valid)', () => {
    expect(isTemplateReference('${{ foo }}')).toBe(true);
    expect(isTemplateReference('{{ foo }}')).toBe(true);
  });

  it('does not match {% liquid tags %}', () => {
    expect(isTemplateReference('{% if condition %}')).toBe(false);
    expect(isTemplateReference('{%- assign x = 1 -%}')).toBe(false);
  });
});
