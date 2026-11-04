/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazySchema, z } from '@kbn/zod/v4';

import { JsonModelSchema } from '../common/json_model_schema';

const PAGE_TRIGGER_TYPE = 'page';
const PAGE_TRIGGER_ID_MAX_LENGTH = 64;
const PAGE_TITLE_MAX_LENGTH = 200;
const PAGE_DESCRIPTION_MAX_LENGTH = 1000;

export const PAGE_TRIGGER_ID_ERROR =
  'Page id must start with a lowercase letter or digit and contain only lowercase letters, digits, "-" and "_"';
export const MULTIPLE_PAGE_TRIGGERS_ERROR = 'A workflow can define at most one page trigger';

/**
 * Runs a workflow from a hosted form built from `inputs`. Steps read the submitted values as
 * `page.inputs.*`, apart from `inputs.*`, because page visitors are not trusted.
 * The access level, URL secret, and run identity live on the page saved object, not in the YAML.
 */
export const PageTriggerSchema = lazySchema(() =>
  z.object({
    type: z.literal(PAGE_TRIGGER_TYPE),
    /** Stable page id. Room for several pages per workflow later. Treated as `default` when omitted. */
    id: z
      .string()
      .max(PAGE_TRIGGER_ID_MAX_LENGTH)
      .regex(/^[a-z0-9][a-z0-9_-]*$/, PAGE_TRIGGER_ID_ERROR)
      .optional(),
    title: z.string().trim().min(1).max(PAGE_TITLE_MAX_LENGTH),
    description: z.string().max(PAGE_DESCRIPTION_MAX_LENGTH).optional(),
    inputs: JsonModelSchema.optional(),
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
