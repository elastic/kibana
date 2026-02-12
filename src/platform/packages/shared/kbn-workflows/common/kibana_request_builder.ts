/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getKibanaConnectors } from '../spec/kibana';
import { KIBANA_TYPE_ALIASES } from '../spec/kibana/aliases';
import type { RequestOptions } from '../types/latest';

// Meta params that control step behavior but should never be forwarded as HTTP params
const KIBANA_STEP_META_KEYS = new Set(['forceServerInfo', 'forceLocalhost', 'debug']);

/**
 * Builds a Kibana HTTP request from connector definitions
 * This is shared between the execution engine and the YAML editor copy functionality
 */
// eslint-disable-next-line complexity
export function buildKibanaRequest(
  actionType: string,
  params: Record<string, unknown>,
  spaceId?: string
): RequestOptions {
  // Support raw API format first - this always works
  if (params.request) {
    const {
      method = 'GET',
      path,
      body,
      query,
      headers,
    } = params.request as Record<string, unknown>;
    return {
      method: method as string,
      path: path as string,
      body: body as Record<string, unknown>,
      query: query as Record<string, string>,
      headers: headers as Record<string, string>,
    };
  }

  // Special case: kibana.request type uses raw API format at top level
  if (actionType === 'kibana.request') {
    const { method = 'GET', path, body, query, headers } = params;
    return {
      method: method as string,
      path: path as string,
      body: body as Record<string, unknown>,
      query: query as Record<string, string>,
      headers: headers as Record<string, string>,
    };
  }

  // Lazy load the generated connectors to avoid main bundle bloat
  const kibanaConnectors = getKibanaConnectors();

  // Resolve alias if the action type uses an old name (backward compatibility)
  const resolvedActionType = KIBANA_TYPE_ALIASES[actionType] ?? actionType;

  // Find the connector definition for this action type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const connector = kibanaConnectors.find((c: any) => c.type === resolvedActionType);

  if (connector && connector.patterns && connector.methods) {
    // Use explicit parameter type metadata (no hardcoded keys!)
    const urlParamKeys = new Set<string>(connector.parameterTypes?.urlParams || []);
    const bodyParamKeys = new Set<string>(connector.parameterTypes?.bodyParams || []);
    const headerParamKeys = new Set<string>(connector.parameterTypes?.headerParams || []);

    // Determine method (allow user override)
    const method = typeof params.method === 'string' ? params.method : connector.methods[0]; // User can override method

    // Choose the best pattern based on available parameters
    let selectedPattern = selectBestPattern(connector.patterns, params);

    // Collect path parameters from the selected pattern
    const pathParams = new Set<string>();
    const pathParamMatches = selectedPattern.match(/\{([^}]+)\}/g);
    if (pathParamMatches) {
      for (const match of pathParamMatches) {
        pathParams.add(match.slice(1, -1)); // Remove { and }
      }
    }

    // Replace path parameters in the selected pattern
    for (const [key, value] of Object.entries(params)) {
      if (pathParams.has(key)) {
        selectedPattern = selectedPattern.replace(`{${key}}`, encodeURIComponent(String(value)));
      }
    }

    // Build body, query parameters, and headers
    const body: Record<string, unknown> = {};
    const queryParams: Record<string, string> = {};
    const headers: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      // Skip path parameters (they're used in the URL), meta parameters, and step-level options
      if (pathParams.has(key) || key === 'method' || KIBANA_STEP_META_KEYS.has(key)) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Handle headers (like kbn-xsrf)
      if (headerParamKeys.has(key)) {
        headers[key] = String(value);
      }
      // Prioritize body parameters over URL parameters when both are available
      else if (bodyParamKeys.has(key)) {
        // This parameter should go in the body
        body[key] = value;
      } else if (urlParamKeys.has(key)) {
        // This parameter should go in URL query parameters
        const queryValue = Array.isArray(value) ? value.join(',') : value;
        queryParams[key] = String(queryValue);
      } else if (key === 'body') {
        // Handle explicit body parameter
        if (typeof value === 'object' && value !== null) {
          Object.assign(body, value);
        }
      } else {
        // All other parameters go in the body (fallback)
        body[key] = value;
      }
    }

    const result = {
      method,
      path: applySpacePrefix(selectedPattern, spaceId),
      body: Object.keys(body).length > 0 ? body : undefined,
      query: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    };

    return result;
  }

  // If no connector found, throw an error suggesting raw API format
  throw new Error(
    `No connector definition found for ${actionType}. Use raw API format with 'request' parameter: { request: { method: 'GET', path: '/api/endpoint', body: {...} } }`
  );
}

function selectBestPattern(patterns: string[], params: Record<string, unknown>): string {
  // Strategy: Prefer patterns where all path parameters are provided

  // Score each pattern based on how well it matches the provided parameters
  let bestPattern = patterns[0];
  let bestScore = -1;

  for (const pattern of patterns) {
    let score = 0;

    // Extract path parameters from this pattern
    const pathParamMatches = pattern.match(/\{([^}]+)\}/g);
    if (pathParamMatches) {
      const patternPathParams = pathParamMatches.map((match) => match.slice(1, -1));

      // Count how many path parameters are satisfied
      let satisfiedParams = 0;
      for (const pathParam of patternPathParams) {
        if (params[pathParam] !== undefined) {
          satisfiedParams++;
        }
      }

      // Score = satisfied params / total params for this pattern
      // Higher score means better match
      score = satisfiedParams / patternPathParams.length;

      // If all path params are satisfied, this is a perfect match
      if (satisfiedParams === patternPathParams.length) {
        return pattern;
      }
    } else {
      // Pattern with no path parameters gets score 1 (always usable)
      score = 1;
    }

    if (score > bestScore) {
      bestScore = score;
      bestPattern = pattern;
    }
  }

  return bestPattern;
}

/**
 * Applies the space prefix to the path for non-default spaces
 * Following Kibana's standard space-aware API pattern: /s/{spaceId}/api/...
 */
function applySpacePrefix(path: string, spaceId?: string): string {
  // Only prepend space prefix for non-default spaces
  // Default space can use /api/... directly without the /s/default prefix
  if (spaceId && spaceId !== 'default') {
    return `/s/${spaceId}${path}`;
  }
  return path;
}
