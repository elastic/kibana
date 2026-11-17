/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';

/** A Terraform resource body, in Terraform JSON syntax. */
export const terraformBodySchema = z.record(z.string(), z.json());

export const panelSummarySchema = z
  .object({
    path: z.string().meta({
      description:
        'API path of the panel, e.g. `panels[2]` or `panels[0].panels[1]` inside a section.',
    }),
    type: z.string().optional(),
    title: z.string().optional(),
  })
  .strict()
  .meta({ description: 'Identifies a panel a conversion reports on.' });

/** Identifies a panel a conversion reports on. */
export type PanelSummary = z.output<typeof panelSummarySchema>;

export const skippedPanelSchema = panelSummarySchema.extend({
  reason: z.string().meta({ description: 'Why the panel could not be converted.' }),
});

export type SkippedPanel = z.output<typeof skippedPanelSchema>;

export const jsonStringPanelSchema = panelSummarySchema.extend({
  reason: z
    .string()
    .meta({ description: 'Why the panel could not be converted to typed attributes.' }),
});

/** A panel exported whole as a JSON string. */
export type JsonStringPanel = z.output<typeof jsonStringPanelSchema>;

export const linkedResourceSchema = z
  .object({
    type: z.string().meta({ description: 'The provider resource type.' }),
    name: z.string().meta({ description: 'Unique among the resources of its type in the module.' }),
    id: z.string().meta({ description: 'The ID of the object it was written from.' }),
    label: z.string().meta({
      description:
        'The object’s display name as the user knows it (not escaped), its ID when it has none.',
    }),
    body: terraformBodySchema,
  })
  .strict()
  .meta({ description: 'A resource written for an object the dashboard refers to.' });

/** A resource written for an object the dashboard refers to. */
export type LinkedResource = z.output<typeof linkedResourceSchema>;
