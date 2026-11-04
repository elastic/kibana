/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { asCodeRelatedItemSchema, MAX_TITLE_LENGTH } from '@kbn/as-code-shared-schemas';
import {
  DASHBOARD_RESOURCE_TYPE,
  jsonStringPanelSchema,
  linkedResourceSchema,
  panelSummarySchema,
  skippedPanelSchema,
  terraformBodySchema,
} from '@kbn/as-code-dashboard-terraform';

export const terraformRequestBodySchema = z
  .object({
    dashboard: z
      .object({
        // The title names the Terraform resource.
        title: z.string().max(MAX_TITLE_LENGTH).optional(),
      })
      .catchall(z.json())
      .meta({ description: 'The sanitized dashboard to convert.' }),
  })
  .strict();

const apiPathsSchema = z.array(z.string());

export const literalTagSchema = z
  .union([
    z
      .object({ id: z.string(), reason: z.enum(['managed', 'unlinkable']), name: z.string() })
      .strict(),
    z.object({ id: z.string(), reason: z.literal('unreadable') }).strict(),
  ])
  .meta({
    description:
      'A tag the dashboard keeps as its literal ID: Kibana manages it, the user cannot read it (or it is missing), or it is also used where the export cannot point at a resource.',
  });

export const literalDataViewSchema = z
  .union([
    z.object({ id: z.string(), reason: z.enum(['not_found', 'unreadable']) }).strict(),
    z
      .object({ id: z.string(), reason: z.enum(['managed', 'unlinkable']), name: z.string() })
      .strict(),
  ])
  .meta({
    description:
      'A data view the dashboard keeps as its literal ID: it is not a saved data view in the space (missing or ad hoc), the user cannot read it, Kibana manages it, or it is also used where the export cannot point at a resource.',
  });

export const exportedDataViewSchema = z
  .object({
    id: z.string(),
    index_pattern: z.string(),
    dropped_fields: apiPathsSchema.meta({
      description: 'Paths in the data view spec of the saved settings its resource cannot hold.',
    }),
    namespaces: z.array(z.string()).meta({
      description:
        'The spaces the data view is currently shared to (`*` for every space), which adopting must keep.',
    }),
  })
  .strict()
  .meta({ description: 'A data view a resource is written for.' });

export const libraryItemSchema = z
  .union([
    asCodeRelatedItemSchema.extend({ title: z.string().optional() }).strict(),
    asCodeRelatedItemSchema.extend({ reason: z.enum(['not_found', 'unreadable']) }).strict(),
  ])
  .meta({
    description:
      'A library item a by-reference panel points at: the panel keeps its ID, so the item must exist with that ID where Terraform applies the module. A reason says it no longer exists in the space or cannot be read.',
  });

export const terraformResponseBodySchema = z
  .object({
    resource_type: z
      .literal(DASHBOARD_RESOURCE_TYPE)
      .meta({ description: 'The provider resource type `body` is for.' }),
    resource_name: z
      .string()
      .meta({ description: 'The name of the dashboard’s resource, from its title.' }),
    body: terraformBodySchema.meta({
      description:
        'The resource body, in Terraform JSON syntax: user text escaped, references to `resources` not.',
    }),
    resources: z.array(linkedResourceSchema).meta({
      description:
        'Resources written for the objects the dashboard refers to (its readable, unmanaged tags, and its saved data views); they pin no ID, which adopting adds in the browser.',
    }),
    tag_resource: z.object({ type: z.string(), min_kibana_version: z.string() }).strict().meta({
      description: 'The tag resource type, and the oldest Kibana Terraform can apply it to.',
    }),
    literal_tags: z
      .array(literalTagSchema)
      .meta({ description: 'The dashboard’s tags that stay literal IDs, with no resource.' }),
    data_view_resource: z
      .object({ type: z.string() })
      .strict()
      .meta({ description: 'The data view resource type.' }),
    data_views: z.array(exportedDataViewSchema).meta({
      description:
        'Each data view in `resources`: its index pattern (not escaped), the settings its resource lacks, its spaces.',
    }),
    literal_data_views: z
      .array(literalDataViewSchema)
      .meta({ description: 'The dashboard’s data views that stay literal IDs, with no resource.' }),
    library_items: z.array(libraryItemSchema).meta({
      description: 'The library items the dashboard’s by-reference panels point at, once each.',
    }),
    related_items: z.array(asCodeRelatedItemSchema).meta({
      description: 'Every saved object the dashboard refers to, once each and not truncated.',
    }),
    dropped_fields: apiPathsSchema.meta({
      description: 'API paths of the fields the resource has no attribute for.',
    }),
    skipped_panels: z.array(skippedPanelSchema).meta({
      description: 'Panels left out of `body` because they could not be converted.',
    }),
    partial_panels: z.array(panelSummarySchema.extend({ dropped_fields: apiPathsSchema })).meta({
      description: 'Converted panels that lost fields; their fields are also in `dropped_fields`.',
    }),
    json_panels: z
      .array(jsonStringPanelSchema)
      .meta({ description: 'Panels exported whole as a JSON string.' }),
    provider: z
      .object({ source: z.string(), version: z.string() })
      .strict()
      .meta({ description: 'The provider and version the conversion was verified against.' }),
  })
  .strict();
