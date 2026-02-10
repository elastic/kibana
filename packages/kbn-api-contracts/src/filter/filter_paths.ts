/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NormalizedSpec } from '../input/normalize_oas';

export interface PathFilterOptions {
  include?: string[];
  exclude?: string[];
}

const matchesPattern = (path: string, pattern: string): boolean => {
  let regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\0GLOBSTAR\0')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');

  regexPattern = regexPattern.replace(/\0GLOBSTAR\0/g, '.*');

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(path);
};

const matchesAnyPattern = (path: string, patterns: string[]): boolean =>
  patterns.some((pattern) => matchesPattern(path, pattern));

export const shouldIncludePath = (
  path: string,
  { include, exclude }: PathFilterOptions
): boolean => {
  if (include && include.length > 0) {
    if (!matchesAnyPattern(path, include)) {
      return false;
    }
  }

  if (exclude && exclude.length > 0) {
    if (matchesAnyPattern(path, exclude)) {
      return false;
    }
  }

  return true;
};

export const filterSpecPaths = (
  spec: NormalizedSpec,
  options: PathFilterOptions
): NormalizedSpec => {
  if (!options.include?.length && !options.exclude?.length) {
    return spec;
  }

  const filteredPaths = Object.fromEntries(
    Object.entries(spec.paths).filter(([path]) => shouldIncludePath(path, options))
  );

  return { paths: filteredPaths };
};
