/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Shared Liquid engine and parse cache for template string parsing.
 * Used by validate_liquid_template, extract_template_local_context, and
 * validate_workflow_yaml so that a single engine instance and a parse cache
 * bounded by total template length are reused across the app.
 */

import type { Liquid, Template } from 'liquidjs';
import { LRUCache } from 'lru-cache';
import { createWorkflowLiquidEngine } from '@kbn/workflows';

let liquidInstance: Liquid | null = null;

/**
 * Returns the shared workflow Liquid engine instance (lazy-initialized).
 * Registers stub filters so that parse() does not throw on known filter names.
 */
export function getLiquidInstance(): Liquid {
  if (!liquidInstance) {
    liquidInstance = createWorkflowLiquidEngine({
      strictFilters: true,
      strictVariables: false,
    });
  }
  return liquidInstance;
}

/**
 * Total template length the cache may hold. The parsed tree grows with the
 * template, not with the entry count: the densest template the engine accepts
 * under strict filters retains ~145 bytes per character, so this is a ceiling
 * of roughly 16 MiB. The largest workflow shipped in this repo holds ~45,000
 * characters of Liquid, so every realistic workflow stays cached in full.
 */
export const MAX_PARSE_CACHE_CHARS = 100_000;

const parseCache = new LRUCache<string, Template[]>({
  maxSize: MAX_PARSE_CACHE_CHARS,
  // The cache rejects a size of zero, and an empty template is valid input.
  sizeCalculation: (_templates, templateString) => Math.max(1, templateString.length),
});

/**
 * Parses a Liquid template string and caches the result.
 * The cache is bounded by total template length: least-recently-used entries
 * are evicted to make room, and a template longer than the whole budget is not
 * retained.
 */
export function parseTemplateString(templateString: string): Template[] {
  const cached = parseCache.get(templateString);
  if (cached) {
    return cached;
  }
  const result = getLiquidInstance().parse(templateString);
  parseCache.set(templateString, result);
  return result;
}
