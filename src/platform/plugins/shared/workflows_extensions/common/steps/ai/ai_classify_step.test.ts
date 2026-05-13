/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildStructuredOutputSchema, ConfigSchema, InputSchema } from './ai_classify_step';

describe('ai_classify_step common', () => {
  describe('schema definitions', () => {
    it('ConfigSchema accepts optional connector-id', () => {
      expect(ConfigSchema.safeParse({}).success).toBe(true);
      expect(ConfigSchema.safeParse({ 'connector-id': 'abc' }).success).toBe(true);
    });

    it('InputSchema requires input and categories', () => {
      expect(InputSchema.safeParse({}).success).toBe(false);
      expect(InputSchema.safeParse({ input: 'text', categories: ['A', 'B'] }).success).toBe(true);
    });

    it('InputSchema rejects empty categories array', () => {
      expect(InputSchema.safeParse({ input: 'text', categories: [] }).success).toBe(false);
    });

    it('InputSchema accepts all optional fields', () => {
      const result = InputSchema.safeParse({
        input: 'text',
        categories: ['A'],
        instructions: 'focus on severity',
        allowMultipleCategories: true,
        fallbackCategory: 'Other',
        includeRationale: true,
        temperature: 0.5,
      });
      expect(result.success).toBe(true);
    });

    it('InputSchema rejects temperature out of range', () => {
      expect(InputSchema.safeParse({ input: 'x', categories: ['A'], temperature: 2 }).success).toBe(
        false
      );
      expect(
        InputSchema.safeParse({ input: 'x', categories: ['A'], temperature: -0.1 }).success
      ).toBe(false);
    });

    it('InputSchema accepts object and array inputs', () => {
      expect(InputSchema.safeParse({ input: { key: 'val' }, categories: ['A'] }).success).toBe(
        true
      );
      expect(InputSchema.safeParse({ input: [1, 2, 3], categories: ['A'] }).success).toBe(true);
    });
  });

  describe('buildStructuredOutputSchema', () => {
    it('returns schema with category field for single classification', () => {
      const schema = buildStructuredOutputSchema({
        input: 'text',
        categories: ['A', 'B'],
      });

      expect(schema.shape).toHaveProperty('category');
      expect(schema.shape).not.toHaveProperty('categories');
      expect(schema.shape).toHaveProperty('metadata');
      expect(schema.shape).not.toHaveProperty('rationale');
    });

    it('returns schema with categories array for multi-label classification', () => {
      const schema = buildStructuredOutputSchema({
        input: 'text',
        categories: ['A', 'B'],
        allowMultipleCategories: true,
      });

      expect(schema.shape).toHaveProperty('categories');
      expect(schema.shape).not.toHaveProperty('category');
    });

    it('includes rationale field when includeRationale is true', () => {
      const schema = buildStructuredOutputSchema({
        input: 'text',
        categories: ['A'],
        includeRationale: true,
      });

      expect(schema.shape).toHaveProperty('rationale');
    });

    it('does not include rationale field when includeRationale is false or undefined', () => {
      const withFalse = buildStructuredOutputSchema({
        input: 'text',
        categories: ['A'],
        includeRationale: false,
      });
      expect(withFalse.shape).not.toHaveProperty('rationale');

      const withUndefined = buildStructuredOutputSchema({
        input: 'text',
        categories: ['A'],
      });
      expect(withUndefined.shape).not.toHaveProperty('rationale');
    });

    it('returns a valid Zod object schema that can parse data', () => {
      const schema = buildStructuredOutputSchema({
        input: 'text',
        categories: ['A', 'B'],
        allowMultipleCategories: true,
        includeRationale: true,
      });

      const result = schema.safeParse({
        categories: ['A'],
        rationale: 'because',
        metadata: { model: 'test' },
      });
      expect(result.success).toBe(true);
    });

    it('returned schema rejects data missing required fields', () => {
      const schema = buildStructuredOutputSchema({
        input: 'text',
        categories: ['A'],
      });

      // Missing category and metadata
      const result = schema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});
