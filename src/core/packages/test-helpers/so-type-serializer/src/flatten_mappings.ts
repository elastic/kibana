/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Flattens a Saved Object mappings definition to a map of dot-separated paths,
 * **preserving empty objects** as explicit `{}` leaves.
 *
 * This differs from `@kbn/std`'s `getFlattenedObject`, which silently drops empty
 * objects: `{ dynamic: false, properties: {} }` flattens to just
 * `{ 'dynamic': false }`, losing the empty `properties`. That loss is harmless for
 * most flattening use cases but not for SO mappings, where an empty object field
 * (`{ dynamic: false, properties: {} }`) is a valid, meaningful mapping. Dropping
 * it makes a round-tripped snapshot produce an invalid mapping (`{ dynamic: false }`
 * with no `properties`) that breaks the migrator.
 *
 * By emitting `'<path>': {}` for empty objects, the flatten/unflatten round-trip
 * becomes lossless for the SO mapping grammar.
 *
 * @example
 *   flattenMappings({ dynamic: false, properties: { foo: { dynamic: false, properties: {} } } })
 *   // => { 'dynamic': false, 'properties.foo.dynamic': false, 'properties.foo.properties': {} }
 */
export const flattenMappings = (mappings: object): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  const walk = (prefix: string, node: Record<string, unknown>): void => {
    const entries = Object.entries(node);

    // Preserve empty objects as explicit leaves so they survive the round-trip.
    if (entries.length === 0 && prefix) {
      result[prefix] = {};
      return;
    }

    entries.forEach(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      if (isObject(value)) {
        walk(path, value);
      } else {
        result[path] = value;
      }
    });
  };

  walk('', mappings as Record<string, unknown>);
  return result;
};
