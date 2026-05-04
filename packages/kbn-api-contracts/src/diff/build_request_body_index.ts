/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPISpec } from '../input/load_oas';

export interface RequestBodyConsumer {
  path: string;
  method: string;
}

export type RequestBodyIndex = Map<string, RequestBodyConsumer[]>;

const REF_PREFIX = '#/components/schemas/';

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'] as const;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const collectReachableComponents = (
  schema: unknown,
  seen: Set<string>,
  out: Set<string>,
  componentSchemas: Record<string, unknown>
): void => {
  if (!isObject(schema)) return;

  const ref = schema.$ref;
  if (typeof ref === 'string' && ref.startsWith(REF_PREFIX)) {
    const name = ref.slice(REF_PREFIX.length);
    if (seen.has(name)) return;
    seen.add(name);
    out.add(name);
    const target = componentSchemas[name];
    if (target !== undefined) {
      collectReachableComponents(target, seen, out, componentSchemas);
    }
    return;
  }

  for (const key of ['allOf', 'oneOf', 'anyOf'] as const) {
    const branches = schema[key];
    if (Array.isArray(branches)) {
      for (const branch of branches) {
        collectReachableComponents(branch, seen, out, componentSchemas);
      }
    }
  }

  const properties = schema.properties;
  if (isObject(properties)) {
    for (const propSchema of Object.values(properties)) {
      collectReachableComponents(propSchema, seen, out, componentSchemas);
    }
  }

  if (schema.items !== undefined) {
    collectReachableComponents(schema.items, seen, out, componentSchemas);
  }

  if (isObject(schema.additionalProperties)) {
    collectReachableComponents(schema.additionalProperties, seen, out, componentSchemas);
  }
};

export const buildRequestBodyIndex = (oas: OpenAPISpec): RequestBodyIndex => {
  const index: RequestBodyIndex = new Map();

  const components = isObject(oas.components) ? oas.components : {};
  const componentSchemas = isObject(components.schemas)
    ? (components.schemas as Record<string, unknown>)
    : {};

  const paths = oas.paths;
  if (!isObject(paths)) return index;

  for (const [pathName, pathEntry] of Object.entries(paths)) {
    if (!isObject(pathEntry)) continue;

    for (const method of HTTP_METHODS) {
      const operation = pathEntry[method];
      if (!isObject(operation)) continue;

      const requestBody = operation.requestBody;
      if (!isObject(requestBody)) continue;

      const content = requestBody.content;
      if (!isObject(content)) continue;

      const reachable = new Set<string>();
      for (const mediaEntry of Object.values(content)) {
        if (!isObject(mediaEntry)) continue;
        const schema = mediaEntry.schema;
        if (schema !== undefined) {
          collectReachableComponents(schema, new Set<string>(), reachable, componentSchemas);
        }
      }

      const upperMethod = method.toUpperCase();
      for (const componentName of reachable) {
        const existing = index.get(componentName);
        if (existing) {
          existing.push({ path: pathName, method: upperMethod });
        } else {
          index.set(componentName, [{ path: pathName, method: upperMethod }]);
        }
      }
    }
  }

  return index;
};
