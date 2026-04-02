/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  buildClassificationRequestPart,
  buildDataPart,
  buildInstructionsPart,
  buildSystemPart,
} from './build_prompts';

describe('build_prompts', () => {
  describe('buildSystemPart', () => {
    it('returns a system-role message with classification rules', () => {
      const parts = buildSystemPart();
      expect(parts).toHaveLength(1);
      expect(parts[0].role).toBe('system');
      expect(parts[0].content).toContain('Output ONLY valid JSON');
      expect(parts[0].content).toContain('Categories are case-sensitive');
    });
  });

  describe('buildDataPart', () => {
    it('wraps object input as json', () => {
      const parts = buildDataPart({ foo: 'bar' });
      expect(parts).toHaveLength(1);
      expect(parts[0].role).toBe('user');
      expect(parts[0].content).toContain('```json');
      expect(parts[0].content).toContain(JSON.stringify({ foo: 'bar' }));
    });

    it('wraps string input as text', () => {
      const parts = buildDataPart('hello world');
      expect(parts).toHaveLength(1);
      expect(parts[0].content).toContain('```text');
      expect(parts[0].content).toContain('hello world');
    });

    it('handles null input (typeof null === "object") by JSON stringifying it', () => {
      const parts = buildDataPart(null);
      expect(parts[0].content).toContain('```json');
      expect(parts[0].content).toContain('null');
    });

    it('handles array input via the json path', () => {
      const parts = buildDataPart([1, 2, 3]);
      expect(parts[0].content).toContain('```json');
      expect(parts[0].content).toContain('[1,2,3]');
    });

    it('handles number input via the text path', () => {
      const parts = buildDataPart(42);
      expect(parts[0].content).toContain('```text');
      expect(parts[0].content).toContain('42');
    });

    it('handles boolean input via the text path', () => {
      const parts = buildDataPart(true);
      expect(parts[0].content).toContain('```text');
      expect(parts[0].content).toContain('true');
    });
  });

  describe('buildInstructionsPart', () => {
    it('returns empty array for undefined instructions', () => {
      expect(buildInstructionsPart(undefined)).toEqual([]);
    });

    it('returns empty array for empty string instructions', () => {
      expect(buildInstructionsPart('')).toEqual([]);
    });

    it('returns a user-role message containing the instructions', () => {
      const parts = buildInstructionsPart('focus on severity');
      expect(parts).toHaveLength(1);
      expect(parts[0].role).toBe('user');
      expect(parts[0].content).toContain('focus on severity');
    });
  });

  describe('buildClassificationRequestPart', () => {
    it('renders all categories as list items', () => {
      const parts = buildClassificationRequestPart({
        categories: ['Urgent', 'Normal', 'Low'],
        allowMultipleCategories: false,
        includeRationale: false,
      });
      expect(parts[0].content).toContain('- Urgent');
      expect(parts[0].content).toContain('- Normal');
      expect(parts[0].content).toContain('- Low');
    });

    it('includes fallback category rule when provided', () => {
      const parts = buildClassificationRequestPart({
        categories: ['A', 'B'],
        allowMultipleCategories: false,
        fallbackCategory: 'Other',
        includeRationale: false,
      });
      expect(parts[0].content).toContain('fallback category: "Other"');
    });

    it('includes single-category rules when allowMultipleCategories is false', () => {
      const parts = buildClassificationRequestPart({
        categories: ['A'],
        allowMultipleCategories: false,
        includeRationale: false,
      });
      expect(parts[0].content).toContain('exactly ONE category');
      expect(parts[0].content).not.toContain('multiple categories');
    });

    it('includes multi-category rules when allowMultipleCategories is true', () => {
      const parts = buildClassificationRequestPart({
        categories: ['A', 'B'],
        allowMultipleCategories: true,
        includeRationale: false,
      });
      expect(parts[0].content).toContain('multiple categories');
      expect(parts[0].content).not.toContain('exactly ONE');
    });

    it('includes rationale rule when includeRationale is true', () => {
      const parts = buildClassificationRequestPart({
        categories: ['A'],
        allowMultipleCategories: false,
        includeRationale: true,
      });
      expect(parts[0].content).toContain('"rationale" field');
    });

    it('does not include rationale rule when includeRationale is false', () => {
      const parts = buildClassificationRequestPart({
        categories: ['A'],
        allowMultipleCategories: false,
        includeRationale: false,
      });
      expect(parts[0].content).not.toContain('rationale');
    });

    it('handles category names containing special characters', () => {
      const categories = ['Category "A"', 'Category\nB', 'Category\\C'];
      const parts = buildClassificationRequestPart({
        categories,
        allowMultipleCategories: false,
        includeRationale: false,
      });
      categories.forEach((cat) => {
        expect(parts[0].content).toContain(`- ${cat}`);
      });
    });
  });
});
