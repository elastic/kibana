/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type FlattenedMappings = Record<string, unknown>;

const collectMappedPropertyPaths = (mappings: FlattenedMappings): Set<string> => {
  const paths = new Set<string>();
  for (const key of Object.keys(mappings)) {
    const segments = key.split('.');
    for (let i = 0; i < segments.length - 1; i++) {
      if (segments[i] === 'properties') {
        paths.add(segments.slice(0, i + 2).join('.'));
      }
    }
  }
  return paths;
};

const hasPropertyPath = (toKeys: string[], propertyPath: string): boolean => {
  const prefix = `${propertyPath}.`;
  return toKeys.some((key) => key === propertyPath || key.startsWith(prefix));
};

export const validateAdditiveOnlyMappings = (
  name: string,
  fromMappings: FlattenedMappings,
  toMappings: FlattenedMappings
): void => {
  const fromPaths = collectMappedPropertyPaths(fromMappings);
  if (fromPaths.size === 0) {
    return;
  }

  const toKeys = Object.keys(toMappings);
  const missing: string[] = [];
  for (const propertyPath of fromPaths) {
    if (!hasPropertyPath(toKeys, propertyPath)) {
      missing.push(propertyPath);
    }
  }

  if (missing.length > 0) {
    missing.sort();
    throw new Error(
      `❌ The '${name}' SO type removes mapped properties, which is not allowed. ` +
        `Missing properties: ${JSON.stringify(missing)}.`
    );
  }
};
