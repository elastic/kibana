/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getElasticsearchConnectors } from '../spec/elasticsearch';
import type { RequestOptions } from '../types/latest';

/**
 * Builds an Elasticsearch request from connector definitions
 * This is shared between the execution engine and the YAML editor copy functionality
 */
// eslint-disable-next-line complexity
export function buildElasticsearchRequest(
  stepType: string,
  params: Record<string, unknown>
): RequestOptions {
  // console.log('DEBUG - Input params:', JSON.stringify(params, null, 2));

  // Special case: elasticsearch.request type uses raw API format at top level
  if (stepType === 'elasticsearch.request') {
    const { method = 'GET', path, body, headers } = params;
    return {
      method: method as string,
      path: path as string,
      body: body as Record<string, unknown>,
      headers: headers as Record<string, string> | undefined,
    };
  }

  // Lazy load the generated connectors to avoid main bundle bloat
  const esConnectors = getElasticsearchConnectors();

  // Find the connector definition for this step type
  const connector = esConnectors.find((c) => c.type === stepType);

  if (connector && connector.patterns && connector.methods) {
    // Use explicit parameter type metadata (no hardcoded keys!)
    const urlParamKeys = new Set<string>(connector.parameterTypes?.urlParams || []);
    const bodyParamKeys = new Set<string>(connector.parameterTypes?.bodyParams || []);

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

    // Debug logging
    // console.log('DEBUG - selectedPattern:', selectedPattern);
    // console.log('DEBUG - pathParams:', Array.from(pathParams));
    // console.log('DEBUG - urlParamKeys:', Array.from(urlParamKeys));
    // console.log('DEBUG - bodyParamKeys:', Array.from(bodyParamKeys));

    // Replace path parameters in the selected pattern
    for (const [key, value] of Object.entries(params)) {
      if (pathParams.has(key)) {
        selectedPattern = selectedPattern.replace(`{${key}}`, encodeURIComponent(String(value)));
      }
    }

    // Build body and query parameters
    let body: Record<string, unknown> = {};
    let bulkBody: Array<Record<string, unknown>> | undefined;
    const queryParams: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      // Skip path parameters (they're used in the URL) and meta parameters
      if (pathParams.has(key) || key === 'method') {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Prioritize body parameters over URL parameters when both are available
      // This is important for search APIs where parameters like 'size' can go in either place
      // but should preferably go in the body for consistency with common usage
      if (bodyParamKeys.has(key)) {
        // This parameter should go in the body
        body[key] = value;
        // console.log(`DEBUG - Added to body (bodyParam): ${key} = ${value}`);
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
        // console.log(`DEBUG - Added to body (fallback): ${key} = ${value}`);
      }
    }

    if (stepType === 'elasticsearch.index' && 'document' in params) {
      body = params.document as Record<string, unknown>;
    }

    if (stepType === 'elasticsearch.bulk' && 'operations' in params) {
      bulkBody = buildBulkBody(params.operations as Array<Record<string, unknown>>);
      body = {};
    }

    const result: RequestOptions = {
      method,
      path: `/${selectedPattern}`,
      body: Object.keys(body).length > 0 ? body : undefined,
      query: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      bulkBody: bulkBody ?? undefined,
    };

    // console.log('DEBUG - Final request:', JSON.stringify(result, null, 2));
    return result;
  }

  // If no connector found, throw an error suggesting raw API format
  throw new Error(
    `No connector definition found for ${stepType}. Use raw API format with 'request' parameter: { request: { method: 'GET', path: '/my-index/_search', body: {...} } }`
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

const OPERATION_TYPES = ['index', 'create', 'update', 'delete'];
function buildBulkBody(operations: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  // check if all operations are documents, not operation rows like index, create, update, delete
  const isDocuments = operations.every(
    (operation) => !Object.keys(operation).every((key) => OPERATION_TYPES.includes(key))
  );
  // backward compatibility with the old format
  if (isDocuments) {
    return operations.flatMap((doc) => {
      return [
        {
          index: {},
        },
        doc,
      ];
    });
  }
  return operations;
}
