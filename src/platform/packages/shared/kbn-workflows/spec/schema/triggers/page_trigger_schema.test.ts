/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  MULTIPLE_PAGE_TRIGGERS_ERROR,
  PAGE_INPUT_RULES_MAX,
  PAGE_UI_FIELDS_MAX,
  PAGE_UI_TEXT_MAX_LENGTH,
  PageTriggerSchema,
} from './page_trigger_schema';
import { WorkflowSchema } from '../../schema';

const workflowWith = (triggers: unknown[]) => ({
  name: 'page workflow',
  triggers,
  steps: [{ name: 'log', type: 'console', with: { message: 'hi' } }],
});

describe('PageTriggerSchema', () => {
  it('does not accept a page-id: the page URL is not part of the YAML', () => {
    const result = PageTriggerSchema.strict().safeParse({ type: 'page', 'page-id': 'abc' });
    expect(result.success).toBe(false);
  });

  describe('inputs', () => {
    const conditionalInputs = {
      type: 'object',
      properties: { kind: { type: 'string', enum: ['a', 'b'] } },
      required: ['kind'],
      allOf: [
        {
          if: { properties: { kind: { const: 'a' } }, required: ['kind'] },
          then: { properties: { details: { type: 'string' } }, required: ['details'] },
          else: { properties: { reason: { type: 'string' } } },
        },
      ],
    };

    it('accepts a root allOf of if/then/else rules', () => {
      const result = PageTriggerSchema.safeParse({ type: 'page', inputs: conditionalInputs });
      expect(result.success).toBe(true);
      expect(result.data?.inputs).toEqual(conditionalInputs);
    });

    it('rejects a rule without if', () => {
      const result = PageTriggerSchema.safeParse({
        type: 'page',
        inputs: { ...conditionalInputs, allOf: [{ then: { required: ['kind'] } }] },
      });
      expect(result.success).toBe(false);
    });

    it('rejects unknown keywords in a rule', () => {
      const result = PageTriggerSchema.safeParse({
        type: 'page',
        inputs: { ...conditionalInputs, allOf: [{ if: {}, not: {} }] },
      });
      expect(result.success).toBe(false);
    });

    it(`rejects more than ${PAGE_INPUT_RULES_MAX} rules`, () => {
      const rule = conditionalInputs.allOf[0];
      const result = PageTriggerSchema.safeParse({
        type: 'page',
        inputs: { ...conditionalInputs, allOf: Array(PAGE_INPUT_RULES_MAX + 1).fill(rule) },
      });
      expect(result.success).toBe(false);
    });

    it('still checks that root required fields exist in properties', () => {
      const result = PageTriggerSchema.safeParse({
        type: 'page',
        inputs: { ...conditionalInputs, required: ['details'] },
      });
      expect(result.success).toBe(false);
    });

    it('still accepts legacy array inputs', () => {
      const result = PageTriggerSchema.safeParse({
        type: 'page',
        inputs: [{ name: 'note', type: 'string' }],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ui', () => {
    it('accepts the supported uiSchema subset', () => {
      const ui = {
        'ui:order': ['kind', 'details', '*'],
        'ui:submitButtonOptions': { submitText: 'Send report' },
        kind: { 'ui:widget': 'radio' },
        details: {
          'ui:widget': 'textarea',
          'ui:placeholder': 'Tell us more',
          'ui:options': { rows: 6 },
        },
        notify: { 'ui:widget': 'toggle', 'ui:help': 'We only email you about this report.' },
      };
      const result = PageTriggerSchema.safeParse({ type: 'page', ui });
      expect(result.success).toBe(true);
      expect(result.data?.ui).toEqual(ui);
    });

    it('rejects an unknown widget', () => {
      const result = PageTriggerSchema.safeParse({
        type: 'page',
        ui: { kind: { 'ui:widget': 'MyCustomWidget' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects custom fields and templates', () => {
      const result = PageTriggerSchema.safeParse({
        type: 'page',
        ui: { kind: { 'ui:field': 'SectionField' } },
      });
      expect(result.success).toBe(false);
    });

    it('rejects text over the length limit', () => {
      const result = PageTriggerSchema.safeParse({
        type: 'page',
        ui: { kind: { 'ui:help': 'x'.repeat(PAGE_UI_TEXT_MAX_LENGTH + 1) } },
      });
      expect(result.success).toBe(false);
    });

    it(`rejects more than ${PAGE_UI_FIELDS_MAX} fields`, () => {
      const ui = Object.fromEntries(
        Array.from({ length: PAGE_UI_FIELDS_MAX + 3 }, (_, index) => [
          `field_${index}`,
          { 'ui:widget': 'text' },
        ])
      );
      const result = PageTriggerSchema.safeParse({ type: 'page', ui });
      expect(result.success).toBe(false);
    });
  });
});

describe('page triggers per workflow', () => {
  it('accepts one page trigger next to other triggers', () => {
    const result = WorkflowSchema.safeParse(workflowWith([{ type: 'manual' }, { type: 'page' }]));
    expect(result.success).toBe(true);
  });

  it('rejects a second page trigger', () => {
    const result = WorkflowSchema.safeParse(workflowWith([{ type: 'page' }, { type: 'page' }]));
    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(MULTIPLE_PAGE_TRIGGERS_ERROR);
  });
});
