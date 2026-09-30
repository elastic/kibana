/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';

import { WorkflowInputSchema } from './manual_trigger_schema';
import { BaseEventSchema } from '../common/base_event';

export const PAGE_TITLE_MAX_LENGTH = 200;
export const PAGE_DESCRIPTION_MAX_LENGTH = 1000;

/**
 * Declares that a workflow is page-addressable: its inputs can be rendered as a
 * hosted form and submitted by someone who is not a Kibana user.
 *
 * Deployment concerns (slug, access level, token rotation, run identity, theme)
 * deliberately live outside the YAML so an admin can change them without
 * producing a new workflow version. The trigger owns only the input contract.
 */
export const PAGE_ID_MAX_LENGTH = 64;

export const PageTriggerSchema = z.object({
  type: z.literal('page'),
  /**
   * Stable key of the page's public URL. Kibana assigns it on first save and keeps it
   * across edits; clone and import assign a new one.
   */
  'page-id': z
    .string()
    .min(1)
    .max(PAGE_ID_MAX_LENGTH)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  title: z.string().max(PAGE_TITLE_MAX_LENGTH).optional(),
  description: z.string().max(PAGE_DESCRIPTION_MAX_LENGTH).optional(),
  inputs: WorkflowInputSchema.optional(),
});
export type PageTrigger = z.infer<typeof PageTriggerSchema>;

export const PageTriggerEventSchema = BaseEventSchema.extend({
  inputs: z.unknown().optional(),
});
export type PageTriggerEvent = z.infer<typeof PageTriggerEventSchema>;

export const isPageTrigger = (trigger: { type?: string }): trigger is PageTrigger =>
  trigger.type === 'page';
