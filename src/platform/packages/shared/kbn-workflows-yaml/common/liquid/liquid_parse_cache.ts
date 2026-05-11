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
 * validate_workflow_yaml so that a single engine instance and a bounded
 * parse cache are reused across the app.
 */

import type { Liquid, Template } from 'liquidjs';
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
    liquidInstance.registerFilter('json_parse', (value: unknown): unknown => {
      if (typeof value !== 'string') {
        return value;
      }
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    });
    liquidInstance.registerFilter('entries', (value: unknown): unknown => {
      return value;
    });
  }
  return liquidInstance;
}

const MAX_PARSE_CACHE_SIZE = 64;

const parseCache = new Map<string, Template[]>();

/**
 * Parses a Liquid template string and caches the result.
 * Uses a bounded LRU cache: when the cache exceeds MAX_PARSE_CACHE_SIZE,
 * the least-recently-used entry is evicted.
 */
export function parseTemplateString(templateString: string): Template[] {
  const cached = parseCache.get(templateString);
  if (cached) {
    parseCache.delete(templateString);
    parseCache.set(templateString, cached);
    return cached;
  }
  const result = getLiquidInstance().parse(templateString);
  parseCache.set(templateString, result);
  if (parseCache.size > MAX_PARSE_CACHE_SIZE) {
    const firstKey = parseCache.keys().next().value;
    if (firstKey !== undefined) {
      parseCache.delete(firstKey);
    }
  }
  return result;
}
