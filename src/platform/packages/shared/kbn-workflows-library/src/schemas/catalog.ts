/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { TemplateMetadataSchema } from './template';

/**
 * Schema for a single row in `catalogs/templates.json`. Shares most fields
 * with the parsed `template-metadata` block but omits `install` (lives in
 * the body) and adds the CI-derived fields the browse UI consumes.
 */
export const TemplateSchema = TemplateMetadataSchema.omit({ install: true })
  .extend({
    definitionUrl: z.string(),
    contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/i, 'Must be `sha256:<hex>`.'),
    fixedConnectors: z.array(z.string()),
  })
  .strict();

export const TemplatesCatalogSchema = z
  .object({
    version: z.string(),
    kibanaVersion: z.string(),
    generatedAt: z.string(),
    templates: z.array(TemplateSchema),
  })
  .strict();

export const KibanaVersionEntrySchema = z
  .object({
    id: z.string(),
    kibana: z.string(),
    active: z.boolean(),
  })
  .strict();

export const KibanaVersionsManifestSchema = z
  .object({
    versions: z.array(KibanaVersionEntrySchema),
    latest: z.string(),
  })
  .strict();

export const ManifestSchema = z
  .object({
    version: z.string(),
    generatedAt: z.string(),
    hashes: z.record(z.string(), z.string()),
  })
  .strict();
