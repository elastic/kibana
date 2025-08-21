/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { getCachedConsoleSpecs, getConsoleSpecs } from './fetcher';
import type { ConsoleSpecDefinitionsResponse } from './fetcher';

export interface EndpointIndexEntry {
  methods: string[];
  patterns: string[]; // e.g. ["_search", "{index}/_search"]
  url_params?: Record<string, any>;
}

export type EndpointIndex = Map<string, EndpointIndexEntry>;

function normalizePattern(p: string): string {
  // Ensure patterns start with '/'
  return p.startsWith('/') ? p : `/${p}`;
}

export function buildEndpointIndex(specs: ConsoleSpecDefinitionsResponse | null): EndpointIndex {
  const index: EndpointIndex = new Map();
  if (!specs) return index;

  const endpoints = specs.es.endpoints || {};
  for (const [name, def] of Object.entries<any>(endpoints)) {
    const methods: string[] = def.methods || [];
    const patterns: string[] = Array.isArray(def.patterns)
      ? def.patterns
      : def.patterns
      ? [def.patterns]
      : [];
    const urlParams = def.url_params;

    const entry: EndpointIndexEntry = {
      methods,
      patterns: patterns.map(normalizePattern),
      url_params: urlParams,
    };

    index.set(name, entry);
  }

  return index;
}

let endpointIndexCache: EndpointIndex | null = null;
let endpointIndexInflight: Promise<EndpointIndex> | null = null;

export async function getOrBuildEndpointIndex(http?: HttpSetup): Promise<EndpointIndex> {
  if (endpointIndexCache) return endpointIndexCache;
  if (endpointIndexInflight) return endpointIndexInflight;

  endpointIndexInflight = (async () => {
    const cached = getCachedConsoleSpecs();
    const specs = cached ?? (await getConsoleSpecs(http));
    const idx = buildEndpointIndex(specs);
    endpointIndexCache = idx;
    endpointIndexInflight = null;
    return idx;
  })();

  return endpointIndexInflight;
}

export interface MatchResult {
  matched: boolean;
  endpointName?: string;
  methods?: string[];
  url_params?: Record<string, any>;
}

export function findEndpointByMethodAndPath(
  index: EndpointIndex,
  method: string,
  path: string
): MatchResult {
  const normPath = normalizePattern(path);
  // naive: check if the path matches any pattern literally or with simple placeholder replacement
  for (const [name, entry] of index.entries()) {
    if (entry.methods.length && !entry.methods.includes(method.toUpperCase())) continue;

    const matches = entry.patterns.some((pat) => {
      // Convert placeholders like {index} to a wildcard segment matcher
      const re = new RegExp(
        '^' + pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\{[^}]+\\\}/g, '[^/]+') + '$'
      );
      return re.test(normPath);
    });

    if (matches) {
      return {
        matched: true,
        endpointName: name,
        methods: entry.methods,
        url_params: entry.url_params,
      };
    }
  }

  return { matched: false };
}
