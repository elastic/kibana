/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazySchema, z } from '@kbn/zod/v4';

import { LegacyWorkflowInputSchema } from './manual_trigger_schema';
import { withJsonModelRootRefinements } from '../common/json_model_schema';
import { JsonModelRootShapeSchema, JsonModelShapeSchema } from '../common/json_model_shape_schema';

const PAGE_TRIGGER_TYPE = 'page';
const PAGE_TRIGGER_ID_MAX_LENGTH = 64;
export const PAGE_TITLE_MAX_LENGTH = 200;
export const PAGE_DESCRIPTION_MAX_LENGTH = 1000;
export const DEFAULT_PAGE_TRIGGER_ID = 'default';
// POC: limits for the rjsf rules and layout hints below.
export const PAGE_INPUT_RULES_MAX = 50;
export const PAGE_UI_FIELDS_MAX = 100;
export const PAGE_UI_TEXT_MAX_LENGTH = 1000;
export const PAGE_UI_KEY_MAX_LENGTH = 256;

export const PAGE_TRIGGER_ID_ERROR =
  'Page id must start with a lowercase letter or digit and contain only lowercase letters, digits, "-" and "_"';
export const MULTIPLE_PAGE_TRIGGERS_ERROR = 'A workflow can define at most one page trigger';

/**
 * POC: one conditional rule of a page form. When the visitor's values match `if`, `then`
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

/** POC: page inputs are JSON Schema with an optional root `allOf` of `if`/`then`/`else` rules. */
export const PageInputsSchema = withJsonModelRootRefinements(
  JsonModelRootShapeSchema.extend({
    allOf: z.array(PageInputRuleSchema).max(PAGE_INPUT_RULES_MAX).optional(),
  })
);
export type PageInputs = z.infer<typeof PageInputsSchema>;

/** POC: widgets the page renderer knows. Any other `ui:widget` value is rejected. */
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

/** POC: presentation hints for one field: a bounded subset of the RJSF uiSchema. */
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
 * POC: form layout for a page: a bounded subset of the RJSF uiSchema. Keys other than
 * `ui:order` and `ui:submitButtonOptions` name a field.
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
 * Runs a workflow from a hosted form built from `inputs`. Steps read the submitted values as
 * `page.inputs.*`, apart from `inputs.*`, because page visitors are not trusted.
 * The access level, URL secret, and run identity live on the page saved object, not in the YAML.
 *
 * POC: `inputs` also accepts root `allOf` rules, and `ui` adds layout hints for the form.
 */
export const PageTriggerSchema = lazySchema(() =>
  z.object({
    type: z.literal(PAGE_TRIGGER_TYPE),
    /** Stable page id. Room for several pages per workflow later. Parsing sets `default` when omitted. */
    id: z
      .string()
      .max(PAGE_TRIGGER_ID_MAX_LENGTH)
      .regex(/^[a-z0-9][a-z0-9_-]*$/, PAGE_TRIGGER_ID_ERROR)
      .default(DEFAULT_PAGE_TRIGGER_ID),
    title: z.string().trim().min(1).max(PAGE_TITLE_MAX_LENGTH),
    description: z.string().max(PAGE_DESCRIPTION_MAX_LENGTH).optional(),
    inputs: z.union([PageInputsSchema, z.array(LegacyWorkflowInputSchema)]).optional(),
    ui: PageUiSchema.optional(),
  })
);
export type PageTrigger = z.infer<typeof PageTriggerSchema>;

export const isPageTrigger = (trigger: { type?: string }): trigger is PageTrigger =>
  trigger.type === PAGE_TRIGGER_TYPE;

/** At most one page trigger per workflow. Use in `superRefine` on the `triggers` array. */
export const validatePageTriggers = (triggers: readonly unknown[], ctx: z.RefinementCtx): void => {
  let seenPageTrigger = false;
  triggers.forEach((trigger, index) => {
    if ((trigger as { type?: unknown } | null)?.type !== PAGE_TRIGGER_TYPE) {
      return;
    }
    if (seenPageTrigger) {
      ctx.addIssue({ code: 'custom', message: MULTIPLE_PAGE_TRIGGERS_ERROR, path: [index] });
    }
    seenPageTrigger = true;
  });
};
