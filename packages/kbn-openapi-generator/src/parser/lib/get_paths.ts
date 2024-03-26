/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Extracts the operationId from a given path string.
 *
 * Example:
 * '/some/path/delete_rule_route.api_client.gen.ts' -> 'delete_rule'
 */
export const getOperationIdFromPath = (path: string) => {
  const match = path.match(/\/([^/]+)_route\.api_method\.gen\.ts$/);
  if (match) {
    return match[1];
  }
  return '';
};

export const getApiMethodRelativePathFromFilePath = (filePath: string, rootDir: string) =>
  `../../..${filePath.replace(rootDir, '').replace(/\.ts$/, '')}`;

export const getSchemaTypesRelativePathFromFilePath = (filePath: string, rootDir: string) =>
  `../../..${filePath
    .replace(rootDir, '')
    .replace(/\.api_method/, '')
    .replace(/\.ts$/, '')}`;
