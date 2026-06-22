/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InstallFormSchema } from './install_form';

/**
 * The `template-metadata` block declared at the top of every template YAML
 * file. Authored by template contributors; consumed by both the catalog
 * generator (in `elastic/workflows`) and by Kibana when it parses a template
 * body fetched from the CDN.
 *
 * `availability` is a semver range over Kibana versions; the catalog generator
 * uses it to decide which per-Kibana-version catalog this version belongs to.
 */
export interface TemplateMetadata {
  slug: string;
  version: string;
  availability: string;
  name: string;
  description: string;
  /**
   * Optional. Absent or empty array means cross-solution — the template
   * appears in every solution context. The catalog generator normalizes
   * empty arrays to absent.
   */
  solutions?: string[];
  /**
   * Closed-vocabulary identifiers; entries match ids in the source repo's
   * `library/categories.yaml`. The catalog generator and (advisory) the
   * Kibana runtime validate entries against the vocab.
   */
  categories: string[];
  icon?: string;
  /** Required only when the body uses `__install__.*` references. */
  install?: InstallFormSchema;
}

/**
 * A single row in the catalog index served by the CDN at
 * `/v1/<kibana-version>/catalogs/templates.json`.
 *
 * Contains the authored `template-metadata` (sans `install` — which is in the
 * body) plus three CI-derived fields the browse UI needs to render cards
 * without fetching each body.
 */
export interface Template extends Omit<TemplateMetadata, 'install'> {
  /** Path of the YAML body, relative to the catalog root. */
  definitionUrl: string;
  /** sha256 of the canonical YAML body, prefixed `sha256:`. */
  contentHash: string;
  /** Connector type ids required by non-snippet steps (e.g. `.abuseipdb`). */
  fixedConnectors: string[];
}

/**
 * The full catalog index file. One per Kibana version.
 */
export interface TemplatesCatalog {
  /** Catalog schema version (currently `v1`). */
  version: string;
  /** The Kibana version this catalog targets (e.g. `9.5`, `main`). */
  kibanaVersion: string;
  /** ISO-8601 timestamp set by the catalog generator at publish time. */
  generatedAt: string;
  templates: Template[];
}

/**
 * `kibana-versions.json` served at the catalog root. Lets a Kibana instance
 * discover which per-Kibana-version catalog to fetch.
 */
export interface KibanaVersionsManifest {
  versions: KibanaVersionEntry[];
  /** The `id` of the entry the `main` (Kibana@HEAD / serverless) catalog points at. */
  latest: string;
}

export interface KibanaVersionEntry {
  /** Directory id under the catalog root (e.g. `9.5`, `main`). */
  id: string;
  /** Resolved semver for the entry (e.g. `9.5.0`, or the `main` build's current semver). */
  kibana: string;
  active: boolean;
}

/**
 * `manifest.json` served alongside each per-Kibana-version catalog.
 * Carries hashes consumers can use to short-circuit refreshes.
 */
export interface Manifest {
  version: string;
  generatedAt: string;
  hashes: Record<string, string>;
}

/**
 * A single workflow input declared at the top of a template body
 * (immediately under the `template-metadata` block).
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
