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

const decodeJsonPointerToken = (token: string): string => {
  return token.replaceAll('~1', '/').replaceAll('~0', '~');
};

export const toYamlSearchPath = (pathFilter: string): string => {
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
