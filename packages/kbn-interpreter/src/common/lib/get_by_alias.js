/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * This is used for looking up function/argument definitions. It looks through
 * the given object/array for a case-insensitive match, which could be either the
 * `name` itself, or something under the `aliases` property.
 */
export function getByAlias(specs, name) {
  const lowerCaseName = name.toLowerCase();
  return Object.values(specs).find(({ name, aliases }) => {
    if (name.toLowerCase() === lowerCaseName) return true;
    return (aliases || []).some((alias) => {
      return alias.toLowerCase() === lowerCaseName;
    });
  });
}
