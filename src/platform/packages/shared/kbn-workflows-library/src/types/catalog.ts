/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type {
  KibanaVersionEntrySchema,
  KibanaVersionsManifestSchema,
  ManifestSchema,
  TemplateSchema,
  TemplatesCatalogSchema,
} from '../schemas/catalog';
import type { TemplateMetadataSchema } from '../schemas/template';

/**
 * The `template-metadata` block declared at the top of every template YAML
 * file. Authored by template contributors; consumed by both the catalog
 * generator (in `elastic/workflows`) and by Kibana when it parses a template
 * body fetched from the CDN.
 *
 * `availability` is a semver range over Kibana versions; the catalog generator
 * uses it to decide which per-Kibana-version catalog this version belongs to.
 */
export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>;

/**
 * A single row in the catalog index served by the CDN at
 * `/v1/<kibana-version>/catalogs/templates.json`.
 *
 * Contains the authored `template-metadata` (sans `install` — which is in the
 * body) plus three CI-derived fields the browse UI needs to render cards
 * without fetching each body.
 */
export type Template = z.infer<typeof TemplateSchema>;

/** The full catalog index file. One per Kibana version. */
export type TemplatesCatalog = z.infer<typeof TemplatesCatalogSchema>;

/**
 * `kibana-versions.json` served at the catalog root. Lets a Kibana instance
 * discover which per-Kibana-version catalog to fetch.
 */
export type KibanaVersionsManifest = z.infer<typeof KibanaVersionsManifestSchema>;

export type KibanaVersionEntry = z.infer<typeof KibanaVersionEntrySchema>;

/**
 * `manifest.json` served alongside each per-Kibana-version catalog.
 * Carries hashes consumers can use to short-circuit refreshes.
 */
export type Manifest = z.infer<typeof ManifestSchema>;

/**
 * A single workflow input declared at the top of a template body
 * (immediately under the `template-metadata` block). Not Zod-validated:
 * this is the parsed-API shape, the workflow body's `inputs:` array is
 * shaped by the wider workflows YAML grammar, not by this package.
 */
export interface TemplateInput {
  name: string;
  type: string;
  required?: boolean;
  description?: string;
  default?: unknown;
}

/**
 * The shape `GET /internal/workflows/library/templates/:slug` returns:
 * the parsed `template-metadata` block plus the workflow body (consts,
 * inputs, triggers, steps) and the original YAML for preview.
 */
export interface TemplateBody {
  metadata: TemplateMetadata;
  /** Original YAML string, surfaced unmodified for preview. */
  raw: string;
  consts?: Record<string, unknown>;
  inputs?: TemplateInput[];
  triggers?: unknown[];
  steps?: unknown[];
}
