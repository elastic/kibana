/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Lazy import to avoid bundling large generated file in main plugin bundle

/**
 * Builds an Elasticsearch request from connector definitions
 * This is shared between the execution engine and the YAML editor copy functionality
 */
export function buildRequestFromConnector(
  stepType: string,
  params: any
): { method: string; path: string; body?: any; params?: any } {
  // console.log('DEBUG - Input params:', JSON.stringify(params, null, 2));

  // Special case: elasticsearch.request type uses raw API format at top level
  if (stepType === 'elasticsearch.request') {
    const { method = 'GET', path, body } = params;
    return { method, path, body };
  }

  // Lazy load the generated connectors to avoid main bundle bloat
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { GENERATED_ELASTICSEARCH_CONNECTORS } = require('./generated_es_connectors');

  // Find the connector definition for this step type
  const connector = GENERATED_ELASTICSEARCH_CONNECTORS.find((c: any) => c.type === stepType);

  if (connector && connector.patterns && connector.methods) {
    // Use explicit parameter type metadata (no hardcoded keys!)
    const urlParamKeys = new Set<string>(connector.parameterTypes?.urlParams || []);
    const bodyParamKeys = new Set<string>(connector.parameterTypes?.bodyParams || []);

    // Determine method (allow user override)
    const method = params.method || connector.methods[0]; // User can override method

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
    const body: any = {};
    const queryParams: any = {};

    for (const [key, value] of Object.entries(params)) {
      // eslint-disable-next-line no-console
      console.log(
        `DEBUG - Processing param: ${key}, isPathParam: ${pathParams.has(
          key
        )}, isUrlParam: ${urlParamKeys.has(key)}, isBodyParam: ${bodyParamKeys.has(key)}`
      );

      // Skip path parameters (they're used in the URL)
      if (pathParams.has(key)) continue;

      // Skip meta parameters that control request building
      if (key === 'method') continue;

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
        queryParams[key] = queryValue;
        /*
        console.log(
          `DEBUG - Added to queryParams: ${key} = ${queryValue} (original: ${JSON.stringify(
            value
          )})`
        );
        */
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

    const result = {
      method,
      path: `/${selectedPattern}`,
      body: Object.keys(body).length > 0 ? body : undefined,
      params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
    };

    // console.log('DEBUG - Final request:', JSON.stringify(result, null, 2));
    return result;
  }

  // If no connector found, throw an error suggesting raw API format
  throw new Error(
    `No connector definition found for ${stepType}. Use raw API format with 'request' parameter: { request: { method: 'GET', path: '/my-index/_search', body: {...} } }`
  );
}

function selectBestPattern(patterns: string[], params: any): string {
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
