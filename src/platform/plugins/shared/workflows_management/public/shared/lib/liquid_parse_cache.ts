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
 * Used by extract_template_local_context (workflow_context and validate_workflow_yaml)
 * so that a single engine instance and a bounded parse cache are reused across the app.
 */

import type { Liquid, Template } from 'liquidjs';
import { createWorkflowLiquidEngine } from '@kbn/workflows';

let liquidInstance: Liquid | null = null;

/**
 * Returns the shared workflow Liquid engine instance (lazy-initialized, with json_parse filter).
 */
export function getLiquidInstance(): Liquid {
  if (!liquidInstance) {
    liquidInstance = createWorkflowLiquidEngine({
      strictFilters: true,
      strictVariables: false,
    });
    liquidInstance.registerFilter('json_parse', (value: unknown): unknown => {
      if (typeof value !== 'string') return value;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    });
  }
  return liquidInstance;
}

/**
 * Maximum number of parsed template strings to keep in memory.
 * Evicting the oldest entries prevents unbounded growth during long editing sessions.
 */
const MAX_PARSE_CACHE_SIZE = 64;

const parseCache = new Map<string, Template[]>();

/**
 * Parses a Liquid template string and caches the result.
 * Uses a bounded LRU cache: when the cache exceeds MAX_PARSE_CACHE_SIZE,
 * the least-recently-used entry is evicted. This is safer than unbounded
 * memoization (e.g. lodash memoize) when many unique template strings
 * are parsed (e.g. while the user is typing).
 *
 * @param templateString - Raw template content (e.g. step message field value)
 * @returns Parsed Liquid templates (AST)
 */
export function parseTemplateString(templateString: string): Template[] {
  const cached = parseCache.get(templateString);
  if (cached) {
    // Move to end (most-recently-used) by re-inserting
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
