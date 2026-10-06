/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertToJsonSchema } from '@stoplight/http-spec/oas';
import { transformOas2Operations } from '@stoplight/http-spec/oas2';
import { transformOas3Operations } from '@stoplight/http-spec/oas3';
import { isRecord } from './schema_walk';
import type { ContractOperation, OpenApiDocument, SchemaBundle } from './types';

const COMPONENT_SCHEMA_REF = /^#\/(?:components\/schemas|definitions)\/(.+)$/;

const rewriteRefs = (node: unknown, seen: WeakSet<object>): void => {
  if (typeof node !== 'object' || node === null || seen.has(node)) {
    return;
  }
  seen.add(node);
  const children = Array.isArray(node) ? node : Object.values(node);
  if (isRecord(node) && typeof node.$ref === 'string') {
    const match = COMPONENT_SCHEMA_REF.exec(node.$ref);
    if (match) {
      node.$ref = `#/__bundled__/${match[1]}`;
    }
  }
  for (const child of children) {
    rewriteRefs(child, seen);
  }
};

const getComponentSchemas = (document: OpenApiDocument): Record<string, unknown> => {
  const { components, definitions } = document;
  if (isRecord(components) && isRecord(components.schemas)) {
    return components.schemas;
  }
  return isRecord(definitions) ? definitions : {};
};

/**
 * Transforms a spec into Prism operations. Unlike Prism's own loader, schemas are not
 * dereferenced: refs point into one shared bundle, which keeps large or recursive specs
 * (Microsoft Graph, Figma) fast to load.
 */
export const loadOperations = (document: OpenApiDocument): ContractOperation[] => {
  const operations =
    'swagger' in document ? transformOas2Operations(document) : transformOas3Operations(document);

  const bundle: SchemaBundle = Object.fromEntries(
    Object.entries(getComponentSchemas(document)).map(([name, schema]) => [
      name,
      convertToJsonSchema(document, schema),
    ])
  );

  const seen = new WeakSet<object>();
  rewriteRefs(bundle, seen);
  return operations.map((operation) => {
    rewriteRefs(operation, seen);
    return Object.assign(operation, { __bundled__: bundle });
  });
};
