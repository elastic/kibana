/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { JsonSchemaObject } from '../lib/json_schema';
import type { FoundIn } from '../lib/schema_args';
import type { ApiRegistry, ApiRegistryDefinition, ApiRequest } from '../registry';
import { UnknownApiError, withApiId } from '../registry';
import { buildKibanaRequestParams } from './request-builder';
import { kbApiManifest, loadKbApi } from './apis';
import type { KbApiDefinition } from './types';

const manifest = withApiId(kbApiManifest);

/** Registry over the Kibana HTTP API surface. */
export const kbApiRegistry: ApiRegistry = {
  manifest,
  loadApi: async (id) => {
    const meta = manifest.find((entry) => entry.id === id);
    if (meta == null) throw new UnknownApiError(id);
    const rawDef = await loadKbApi(meta);
    return {
      definition: toRegistryDefinition(rawDef),
      buildRequest: (input): ApiRequest => {
        const p = buildKibanaRequestParams(rawDef, input);
        const req: {
          method: string;
          path: string;
          querystring?: Record<string, unknown>;
          body?: unknown;
          multipartFields?: Record<string, string>;
        } = { method: p.method, path: p.path };
        if (p.querystring != null) req.querystring = p.querystring;
        if (p.multipartFields != null) req.multipartFields = p.multipartFields;
        else if (p.body !== undefined) req.body = p.body;
        return req;
      },
    };
  },
};

/**
 * Normalizes a {@link KbApiDefinition} into the unified {@link ApiRegistryDefinition} shape
 * for display purposes (api_manual). The schema keys on `input` use `cliFlag ?? name`.
 */
function toRegistryDefinition(def: KbApiDefinition): ApiRegistryDefinition {
  return {
    name: def.name,
    namespace: def.namespace,
    description: def.description,
    method: def.method,
    path: def.path,
    input: buildKbRegistryInput(def),
  };
}

/**
 * Builds a JSON Schema object for a Kibana API definition.
 *
 * Each path, query, and body parameter becomes a property in the schema with
 * the appropriate `x-found-in` annotation and a JSON Schema type.
 *
 * This is a temporary shim until the Kibana API generator emits JSON Schema
 * directly (analogous to what the ES client generator now does).
 */
function buildKbRegistryInput(def: KbApiDefinition): JsonSchemaObject | undefined {
  const properties: Record<string, Record<string, unknown>> = {};
  const required: string[] = [];

  const addParam = (
    key: string,
    kbType: string | undefined,
    description: string,
    foundIn: FoundIn,
    isRequired: boolean
  ) => {
    let jsonType: string;
    switch (kbType) {
      case 'boolean':
        jsonType = 'boolean';
        break;
      case 'number':
        jsonType = 'number';
        break;
      case 'array':
        jsonType = 'array';
        break;
      case 'object':
        jsonType = 'object';
        break;
      default:
        jsonType = 'string';
    }
    properties[key] = {
      type: jsonType,
      description,
      'x-found-in': foundIn,
    };
    if (isRequired) required.push(key);
  };

  for (const p of def.pathParams ?? []) {
    addParam(p.name, 'string', p.description, 'path', p.required);
  }

  for (const q of def.queryParams ?? []) {
    addParam(q.cliFlag ?? q.name, q.type, q.description, 'query', q.required === true);
  }

  for (const b of def.bodyParams ?? []) {
    addParam(b.cliFlag ?? b.name, b.type, b.description, 'body', b.required === true);
  }

  if (Object.keys(properties).length === 0) return undefined;

  const schema: JsonSchemaObject = { type: 'object', properties };
  if (required.length > 0) schema.required = required;
  return schema;
}
