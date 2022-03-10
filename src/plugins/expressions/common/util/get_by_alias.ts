/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * This is used for looking up function/argument definitions. It looks through
 * the given object/array for a case-insensitive match, which could be either the
 * `name` itself, or something under the `aliases` property.
 */

export const ALL_NAMESPACES = '*';

export function getByAlias<T extends { name?: string; aliases?: string[]; namespace?: string }>(
  node: T[] | Record<string, T>,
  nodeName: string,
  nameSpace?: string
): T | undefined {
  const lowerCaseName = nodeName.toLowerCase();
  return Object.values(node).find(({ name, aliases, namespace }) => {
    if (!name) return false;
    if (name.toLowerCase() === lowerCaseName) {
      if (!namespace || nameSpace === ALL_NAMESPACES || namespace === nameSpace) return true;
    }
    return (aliases || []).some((alias) => {
      return (
        alias.toLowerCase() === lowerCaseName &&
        (!namespace || nameSpace === ALL_NAMESPACES || namespace === nameSpace)
      );
    });
  });
}
