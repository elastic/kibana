/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const normalizePathFilter = (pathFilter: string): string => {
  return pathFilter.startsWith('/') ? pathFilter : `/${pathFilter}`;
};

// JSON Pointer escape rules: only "~0" -> "~" and "~1" -> "/".
// Spec: https://www.rfc-editor.org/rfc/rfc6901
const decodeJsonPointerToken = (token: string): string => {
  let decoded = '';

  for (let index = 0; index < token.length; index++) {
    const char = token[index];
    if (char !== '~') {
      decoded += char;
      continue;
    }

    const nextChar = token[index + 1];
    if (nextChar === '0') {
      decoded += '~';
      index++;
      continue;
    }

    if (nextChar === '1') {
      decoded += '/';
      index++;
      continue;
    }

    throw new Error(`Invalid JSON pointer escape sequence in token "${token}"`);
  }

  return decoded;
};

export const toYamlSearchPath = (pathFilter: string): string => {
  // For cheap YAML pre-filtering, normalize legacy JSON pointer filters to route-style paths.
  // Example in/out:
  // - "/paths/~1api~1fleet~1agent_policies" -> "/api/fleet/agent_policies"
  // - "/api/fleet/agent_policies" -> "/api/fleet/agent_policies"
  const normalizedPathFilter = normalizePathFilter(pathFilter);
  const parts = normalizedPathFilter.split('/').filter(Boolean);

  // Backward-compatible support for callers still passing JSON pointers.
  if (parts[0] !== 'paths' || !parts[1]) {
    return normalizedPathFilter;
  }

  const decodedPath = decodeJsonPointerToken(parts[1]);
  return decodedPath.startsWith('/') ? decodedPath : `/${decodedPath}`;
};

export const toInstancePathFilter = (pathFilter: string): string => {
  // For AJV error.instancePath matching, convert route-style paths to OAS JSON pointer prefixes.
  // Example in/out:
  // - "/api/fleet/agent_policies" -> "/paths/~1api~1fleet~1agent_policies"
  // - "/paths/~1api~1fleet~1agent_policies" -> "/paths/~1api~1fleet~1agent_policies"
  const normalizedPathFilter = normalizePathFilter(pathFilter);

  // Backward-compatible support for callers already providing JSON pointer paths.
  if (normalizedPathFilter.startsWith('/paths/')) {
    return normalizedPathFilter;
  }

  // Convert route-style path (/api/my-path) to instancePath JSON pointer prefix
  // used by AJV errors (/paths/~1api~1my-path...).
  const pointerToken = normalizedPathFilter.replaceAll('~', '~0').replaceAll('/', '~1');
  return `/paths/${pointerToken}`;
};
