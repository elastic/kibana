/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  matchesPageInputCondition,
  resolvePageInputsSchema,
  validatePageInputs,
} from './page_inputs';
import type { PageInputs } from '../schema/triggers/page_trigger_schema';

const cveSchema: PageInputs = {
  type: 'object',
  properties: {
    image_type: {
      type: 'string',
      oneOf: [
        { const: 'official', title: 'Official image' },
        { const: 'custom', title: 'Custom image' },
      ],
    },
  },
  required: ['image_type'],
  allOf: [
    {
      if: { properties: { image_type: { const: 'official' } }, required: ['image_type'] },
      then: {
        properties: {
          summary: { type: 'string', minLength: 1 },
          wants_contact: { type: 'boolean', default: false },
        },
        required: ['summary'],
      },
    },
    {
      if: {
        properties: { image_type: { const: 'official' }, wants_contact: { const: true } },
        required: ['image_type', 'wants_contact'],
      },
      then: {
        properties: { contact_email: { type: 'string', format: 'email' } },
        required: ['contact_email'],
      },
    },
  ],
};

describe('matchesPageInputCondition', () => {
  it('matches a const condition', () => {
    const condition = { properties: { a: { const: 'x' } }, required: ['a'] };
    expect(matchesPageInputCondition(condition, { a: 'x' })).toBe(true);
    expect(matchesPageInputCondition(condition, { a: 'y' })).toBe(false);
    expect(matchesPageInputCondition(condition, {})).toBe(false);
  });

  it('treats a missing optional property as a match', () => {
    expect(matchesPageInputCondition({ properties: { a: { const: 'x' } } }, {})).toBe(true);
  });

  it('matches an enum condition', () => {
    const condition = { properties: { a: { enum: ['x', 'y'] } }, required: ['a'] };
    expect(matchesPageInputCondition(condition, { a: 'y' })).toBe(true);
    expect(matchesPageInputCondition(condition, { a: 'z' })).toBe(false);
  });
});

describe('resolvePageInputsSchema', () => {
  it('returns the root schema when no rule matches', () => {
    const resolved = resolvePageInputsSchema(cveSchema, { image_type: 'custom' });
    expect(Object.keys(resolved?.properties ?? {})).toEqual(['image_type']);
    expect(resolved?.required).toEqual(['image_type']);
    expect(resolved).not.toHaveProperty('allOf');
  });

  it('adds the fields and required names of every matching rule', () => {
    const resolved = resolvePageInputsSchema(cveSchema, {
      image_type: 'official',
      wants_contact: true,
    });
    expect(Object.keys(resolved?.properties ?? {})).toEqual([
      'image_type',
      'summary',
      'wants_contact',
      'contact_email',
    ]);
    expect(resolved?.required).toEqual(['image_type', 'summary', 'contact_email']);
  });

  it('applies the else branch when the condition does not match', () => {
    const resolved = resolvePageInputsSchema(
      {
        type: 'object',
        properties: { flag: { type: 'boolean' } },
        allOf: [
          {
            if: { properties: { flag: { const: true } }, required: ['flag'] },
            then: { properties: { yes: { type: 'string' } } },
            else: { properties: { no: { type: 'string' } } },
          },
        ],
      },
      { flag: false }
    );
    expect(Object.keys(resolved?.properties ?? {})).toEqual(['flag', 'no']);
  });
});

describe('validatePageInputs', () => {
  it('requires a field that a matching rule makes required', () => {
    const result = validatePageInputs(cveSchema, { image_type: 'official' });
    expect(result).toEqual({
      success: false,
      issues: [{ path: ['summary'], message: 'This field is required' }],
    });
  });

  it('checks the format of a conditional field', () => {
    const result = validatePageInputs(cveSchema, {
      image_type: 'official',
      summary: 'CVE-2026-1',
      wants_contact: true,
      contact_email: 'not-an-email',
    });
    expect(result.success).toBe(false);
    expect(!result.success && result.issues[0].path).toEqual(['contact_email']);
  });

  it('drops the values of fields that no active rule declares', () => {
    const result = validatePageInputs(cveSchema, {
      image_type: 'custom',
      summary: 'left over from a previous choice',
      injected: 'x',
    });
    expect(result).toEqual({ success: true, data: { image_type: 'custom' } });
  });

  it('accepts a complete submission', () => {
    const result = validatePageInputs(cveSchema, {
      image_type: 'official',
      summary: 'CVE-2026-1',
      wants_contact: true,
      contact_email: 'me@example.com',
    });
    expect(result).toEqual({
      success: true,
      data: {
        image_type: 'official',
        summary: 'CVE-2026-1',
        wants_contact: true,
        contact_email: 'me@example.com',
      },
    });
  });

  it('rejects a value outside the declared choices', () => {
    expect(validatePageInputs(cveSchema, { image_type: 'other' }).success).toBe(false);
  });
});
