/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '@kbn/connector-contract-mock';
import { convertSwagger2 } from '@kbn/connector-contract-mock';
import type { JsonObject } from './json_pointer';
import {
  forEachRef,
  getAtTokens,
  isJsonObject,
  localRefToPointer,
  setAtTokens,
  toPointer,
  toTokens,
} from './json_pointer';

/** An operation to keep: its lowercase method and path template. */
export interface ProjectedOperation {
  readonly method: string;
  readonly path: string;
}

// Documentation and vendor extensions; they change without the contract changing.
const STRIPPED_KEYWORDS = new Set([
  'description',
  'summary',
  'example',
  'examples',
  'externalDocs',
  'tags',
]);

// Values that are data, not spec objects, so nothing in them is stripped.
const LITERAL_KEYWORDS = new Set([
  'enum',
  'const',
  'default',
  // Pagination extensions, which describe the contract and are read to propose descriptors.
  'x-speakeasy-pagination',
  'x-ms-pageable',
]);

// Objects whose keys are names (properties, status codes, media types, ...), not keywords.
const NAME_MAPS = new Set([
  'paths',
  'webhooks',
  'properties',
  'patternProperties',
  '$defs',
  'definitions',
  'dependentSchemas',
  'schemas',
  'parameters',
  'responses',
  'requestBodies',
  'headers',
  'securitySchemes',
  'links',
  'callbacks',
  'content',
  'encoding',
  'variables',
  'mapping',
  'pathItems',
  'scopes',
]);

const PATH_ITEM_KEYS = new Set(['parameters', 'servers', '$ref']);

/**
 * Removes documentation and `x-` extensions other than pagination ones from spec objects,
 * keeping names and literal values.
 */
export const normalizeSpecNode = (value: unknown, isNameMap = false): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeSpecNode(item));
  }
  if (!isJsonObject(value)) {
    return value;
  }
  const result: JsonObject = {};
  for (const [key, child] of Object.entries(value)) {
    if (isNameMap) {
      result[key] = normalizeSpecNode(child);
    } else if (LITERAL_KEYWORDS.has(key)) {
      result[key] = child;
    } else if (key === 'security' && Array.isArray(child)) {
      // Requirements are keyed by scheme names, which may start with `x-`.
      result[key] = child.map((requirement) => normalizeSpecNode(requirement, true));
    } else if (!STRIPPED_KEYWORDS.has(key) && !key.startsWith('x-')) {
      result[key] = normalizeSpecNode(child, NAME_MAPS.has(key) && isJsonObject(child));
    }
  }
  return result;
};

const pickPaths = (paths: unknown, operations: readonly ProjectedOperation[]): JsonObject => {
  const picked: JsonObject = {};
  for (const { method, path } of operations) {
    const item = isJsonObject(paths) ? paths[path] : undefined;
    if (isJsonObject(item) && isJsonObject(item[method])) {
      const kept = isJsonObject(picked[path])
        ? (picked[path] as JsonObject)
        : Object.fromEntries(Object.entries(item).filter(([key]) => PATH_ITEM_KEYS.has(key)));
      picked[path] = { ...kept, [method]: item[method] };
    }
  }
  return picked;
};

const securitySchemeNames = (requirements: unknown): string[] =>
  Array.isArray(requirements)
    ? requirements.flatMap((r) => (isJsonObject(r) ? Object.keys(r) : []))
    : [];

// Refs into components keep the whole component, so refs into its parts keep resolving.
const toKeptTokens = (tokens: string[]): string[] =>
  tokens[0] === 'components' ? tokens.slice(0, 3) : tokens;

/**
 * Trims an OpenAPI 3.x document (Swagger 2.0 is converted first) to the given operations, with
 * their path-level parameters and servers, the security schemes they use and every component
 * they reference, directly or through other components. Documentation, examples, `x-`
 * extensions other than pagination ones and `info` other than the title are left out, so the
 * result only changes when the contract does.
 */
export const projectSpec = (
  source: OpenApiDocument,
  operations: readonly ProjectedOperation[]
): OpenApiDocument => {
  const document = source.swagger === '2.0' ? convertSwagger2(source) : source;
  const { openapi, jsonSchemaDialect, info, servers, security, paths } = document;
  const projected = normalizeSpecNode({
    openapi,
    ...(jsonSchemaDialect === undefined ? {} : { jsonSchemaDialect }),
    info: { title: isJsonObject(info) ? info.title : undefined },
    ...(servers === undefined ? {} : { servers }),
    ...(security === undefined ? {} : { security }),
    paths: pickPaths(paths, operations),
  }) as JsonObject;

  const kept = new Set<string>();
  const queue: unknown[] = [projected];
  const keep = (tokens: string[]) => {
    const pointer = toPointer(tokens);
    const target = getAtTokens(document, tokens);
    if (kept.has(pointer) || target === undefined) {
      return;
    }
    kept.add(pointer);
    const normalized = normalizeSpecNode(target);
    setAtTokens(projected, tokens, normalized);
    queue.push(normalized);
  };

  const schemeNames = new Set(securitySchemeNames(security));
  for (const item of Object.values(projected.paths as JsonObject)) {
    for (const operation of Object.values(item as JsonObject)) {
      if (isJsonObject(operation)) {
        securitySchemeNames(operation.security).forEach((name) => schemeNames.add(name));
      }
    }
  }
  [...schemeNames].sort().forEach((name) => keep(['components', 'securitySchemes', name]));

  while (queue.length > 0) {
    forEachRef(queue.shift(), (ref) => {
      const pointer = localRefToPointer(ref);
      if (pointer !== undefined) {
        keep(toKeptTokens(toTokens(pointer)));
      }
    });
  }
  return projected;
};
