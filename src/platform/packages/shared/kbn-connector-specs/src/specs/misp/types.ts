/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, lazySchema } from '@kbn/zod/v4';

const MAX_SEARCH_LIMIT = 100;
const DEFAULT_SEARCH_LIMIT = 10;

export const SearchAttributesInputSchema = lazySchema(() =>
  z.object({
    value: z.string().min(1).optional().describe('IOC value to search for.'),
    type: z
      .string()
      .min(1)
      .optional()
      .describe('MISP attribute type filter (ip-dst, domain, md5, …).'),
    category: z.string().min(1).optional().describe('MISP attribute category filter.'),
    tags: z.array(z.string().min(1)).max(50).optional().describe('Tag names to filter on.'),
    eventId: z
      .string()
      .min(1)
      .optional()
      .describe('Restrict results to a single event id or UUID.'),
    limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).default(DEFAULT_SEARCH_LIMIT),
    page: z.coerce.number().int().min(1).default(1),
  })
);
export type SearchAttributesInput = z.infer<typeof SearchAttributesInputSchema>;

export const SearchEventsInputSchema = lazySchema(() =>
  z.object({
    value: z.string().min(1).optional().describe('IOC value that must appear in the event.'),
    tags: z.array(z.string().min(1)).max(50).optional().describe('Tag names to filter on.'),
    eventInfo: z.string().min(1).optional().describe('Substring match against event info/title.'),
    from: z
      .string()
      .min(1)
      .optional()
      .describe('Published/date lower bound (YYYY-MM-DD or timestamp).'),
    to: z
      .string()
      .min(1)
      .optional()
      .describe('Published/date upper bound (YYYY-MM-DD or timestamp).'),
    limit: z.coerce.number().int().min(1).max(MAX_SEARCH_LIMIT).default(DEFAULT_SEARCH_LIMIT),
    page: z.coerce.number().int().min(1).default(1),
  })
);
export type SearchEventsInput = z.infer<typeof SearchEventsInputSchema>;

export const CheckIndicatorInputSchema = lazySchema(() =>
  z.object({
    value: z.string().min(1).describe('IOC value to look up.'),
    type: z
      .string()
      .min(1)
      .optional()
      .describe('Optional MISP attribute type hint (ip-dst, domain, …).'),
  })
);
export type CheckIndicatorInput = z.infer<typeof CheckIndicatorInputSchema>;

export const AddSightingInputSchema = lazySchema(() =>
  z
    .object({
      attributeId: z
        .string()
        .min(1)
        .optional()
        .describe('Attribute id or UUID to attach the sighting to.'),
      value: z.string().min(1).optional().describe('Attribute value when id/UUID is unknown.'),
      type: z.coerce
        .number()
        .int()
        .min(0)
        .max(2)
        .default(0)
        .describe('Sighting type: 0=sighting, 1=false-positive, 2=expiration.'),
      source: z.string().max(255).optional().describe('Optional sighting source label.'),
    })
    .refine((input) => Boolean(input.attributeId) || Boolean(input.value), {
      message: 'Provide attributeId or value.',
    })
);
export type AddSightingInput = z.infer<typeof AddSightingInputSchema>;

export const GetEventInputSchema = lazySchema(() =>
  z.object({
    eventId: z.string().min(1).describe('Event id or UUID.'),
  })
);
export type GetEventInput = z.infer<typeof GetEventInputSchema>;

export const CheckWarninglistInputSchema = lazySchema(() =>
  z.object({
    values: z
      .array(z.string().min(1))
      .min(1)
      .max(100)
      .describe('Indicator values to check against enabled warninglists.'),
  })
);
export type CheckWarninglistInput = z.infer<typeof CheckWarninglistInputSchema>;

export const CreateEventInputSchema = lazySchema(() =>
  z.object({
    info: z.string().min(1).max(1024).describe('Event title / info (required).'),
    distribution: z.coerce.number().int().min(0).max(3).optional(),
    threatLevelId: z.coerce.number().int().min(1).max(4).optional(),
    analysis: z.coerce.number().int().min(0).max(2).optional(),
    published: z.boolean().optional().default(false),
  })
);
export type CreateEventInput = z.infer<typeof CreateEventInputSchema>;

export const AddAttributeInputSchema = lazySchema(() =>
  z.object({
    eventId: z.string().min(1).describe('Event id or UUID to attach the attribute to.'),
    type: z.string().min(1).describe('MISP attribute type (ip-dst, domain, md5, …).'),
    value: z.string().min(1).describe('Attribute value.'),
    category: z.string().min(1).optional(),
    toIds: z.boolean().optional().default(true),
    comment: z.string().max(1024).optional(),
  })
);
export type AddAttributeInput = z.infer<typeof AddAttributeInputSchema>;

export const PublishEventInputSchema = lazySchema(() =>
  z.object({
    eventId: z.string().min(1).describe('Event id or UUID to publish.'),
  })
);
export type PublishEventInput = z.infer<typeof PublishEventInputSchema>;

export const AddTagToEventInputSchema = lazySchema(() =>
  z.object({
    eventId: z.string().min(1).describe('Event id or UUID.'),
    tag: z.string().min(1).describe('Tag name or id to apply.'),
  })
);
export type AddTagToEventInput = z.infer<typeof AddTagToEventInputSchema>;
