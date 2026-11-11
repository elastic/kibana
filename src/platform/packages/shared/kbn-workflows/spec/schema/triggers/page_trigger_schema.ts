/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

import { LegacyWorkflowInputSchema } from './manual_trigger_schema';
import { BaseEventSchema } from '../common/base_event';
import { withJsonModelRootRefinements } from '../common/json_model_schema';
import { JsonModelRootShapeSchema, JsonModelShapeSchema } from '../common/json_model_shape_schema';

export const PAGE_TITLE_MAX_LENGTH = 200;
export const PAGE_DESCRIPTION_MAX_LENGTH = 1000;
export const PAGE_INPUT_RULES_MAX = 50;
export const PAGE_UI_FIELDS_MAX = 100;
export const PAGE_UI_TEXT_MAX_LENGTH = 1000;
export const PAGE_UI_KEY_MAX_LENGTH = 256;

/**
 * One conditional rule of a page form. When the visitor's values match `if`, `then`
 * applies; otherwise `else` applies. A branch can add fields and make fields required,
 * so a field declared only in a branch shows up only while its branch applies.
 */
export const PageInputRuleSchema = z
  .object({
    if: JsonModelShapeSchema,
    then: JsonModelShapeSchema.optional(),
    else: JsonModelShapeSchema.optional(),
  })
  .strict();
export type PageInputRule = z.infer<typeof PageInputRuleSchema>;

/** Page inputs are JSON Schema with an optional root `allOf` of `if`/`then`/`else` rules. */
export const PageInputsSchema = withJsonModelRootRefinements(
  JsonModelRootShapeSchema.extend({
    allOf: z.array(PageInputRuleSchema).max(PAGE_INPUT_RULES_MAX).optional(),
  })
);
export type PageInputs = z.infer<typeof PageInputsSchema>;

/** Widgets the page renderer knows. Any other `ui:widget` value is rejected. */
export const PAGE_UI_WIDGETS = [
  'text',
  'textarea',
  'email',
  'radio',
  'select',
  'checkbox',
  'toggle',
  'hidden',
] as const;

const pageUiText = z.string().max(PAGE_UI_TEXT_MAX_LENGTH);

/** Presentation hints for one field: a bounded subset of the RJSF uiSchema. */
export const PageUiFieldSchema = z
  .object({
    'ui:widget': z.enum(PAGE_UI_WIDGETS).optional(),
    'ui:title': pageUiText.optional(),
    'ui:description': pageUiText.optional(),
    'ui:help': pageUiText.optional(),
    'ui:placeholder': pageUiText.optional(),
    'ui:autofocus': z.boolean().optional(),
    'ui:options': z
      .object({
        rows: z.number().int().min(1).max(50).optional(),
        inline: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type PageUiField = z.infer<typeof PageUiFieldSchema>;

/**
 * Form layout for a page: a bounded subset of the RJSF uiSchema. Keys other than
 * `ui:order` and `ui:submitButtonOptions` name a field. Custom fields and templates are
 * not accepted, so the YAML can only pick from the widgets the page ships.
 */
export const PageUiSchema = z
  .object({
    'ui:order': z.array(z.string().max(PAGE_UI_KEY_MAX_LENGTH)).max(PAGE_UI_FIELDS_MAX).optional(),
    'ui:submitButtonOptions': z
      .object({ submitText: z.string().max(PAGE_TITLE_MAX_LENGTH).optional() })
      .strict()
      .optional(),
  })
  .catchall(PageUiFieldSchema)
  .refine((ui) => Object.keys(ui).length <= PAGE_UI_FIELDS_MAX + 2, {
    message: `ui can describe at most ${PAGE_UI_FIELDS_MAX} fields`,
  })
  .refine((ui) => Object.keys(ui).every((key) => key.length <= PAGE_UI_KEY_MAX_LENGTH), {
    message: `ui field names can have at most ${PAGE_UI_KEY_MAX_LENGTH} characters`,
  });
export type PageUi = z.infer<typeof PageUiSchema>;

/**
 * Declares that a workflow is page-addressable: its inputs can be rendered as a
 * hosted form and submitted by someone who is not a Kibana user.
 *
 * Deployment concerns (slug, access level, token rotation, run identity, theme)
 * deliberately live outside the YAML so an admin can change them without
 * producing a new workflow version. The trigger owns only the input contract.
 */
export const PageTriggerSchema = z.object({
  type: z.literal('page'),
  title: z.string().max(PAGE_TITLE_MAX_LENGTH).optional(),
  description: z.string().max(PAGE_DESCRIPTION_MAX_LENGTH).optional(),
  inputs: z.union([PageInputsSchema, z.array(LegacyWorkflowInputSchema)]).optional(),
  ui: PageUiSchema.optional(),
});
export type PageTrigger = z.infer<typeof PageTriggerSchema>;

export const PageTriggerEventSchema = BaseEventSchema.extend({
  inputs: z.unknown().optional(),
});
export type PageTriggerEvent = z.infer<typeof PageTriggerEventSchema>;

export const isPageTrigger = (trigger: { type?: string }): trigger is PageTrigger =>
  trigger.type === 'page';

export const MULTIPLE_PAGE_TRIGGERS_ERROR = 'A workflow can define at most one page trigger';

/**
 * A workflow has at most one page: the workflow document holds a single page key, so a
 * second page trigger would have no address of its own.
 */
export const hasAtMostOnePageTrigger = (triggers: readonly unknown[]): boolean =>
  triggers.filter(
    (trigger) =>
      typeof trigger === 'object' &&
      trigger !== null &&
      'type' in trigger &&
      trigger.type === 'page'
  ).length <= 1;
