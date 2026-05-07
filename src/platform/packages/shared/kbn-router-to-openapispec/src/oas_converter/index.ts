/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import type { KnownParameters, OpenAPIConverter } from '../type';
import type { Env } from '../generate_oas';

import { kbnConfigSchemaConverter } from './kbn_config_schema';
import { createCtx, postProcessMutations } from './kbn_config_schema/post_process_mutations';
import { zodConverter } from './zod';
import { catchAllConverter } from './catch_all';

export class OasConverter {
  readonly #env: Env;
  readonly #converters: OpenAPIConverter[] = [
    kbnConfigSchemaConverter,
    zodConverter,
    catchAllConverter,
  ];
  readonly #sharedSchemas = new Map<string, OpenAPIV3.SchemaObject>();

  constructor(env: Env = { serverless: false }) {
    this.#env = env;
  }

  /**
   * Unwrap a RouteValidationFunction produced by buildRouteValidationWithZod
   * so the original Zod schema is visible to the converter chain.
   */
  #unwrapSchema(schema: unknown): unknown {
    if (typeof schema === 'function' && '_sourceSchema' in schema && schema._sourceSchema != null) {
      return schema._sourceSchema;
    }
    return schema;
  }

  #getConverter(schema: unknown) {
    return this.#converters.find((c) => c.is(schema))!;
  }

  #addComponents(components: { [id: string]: OpenAPIV3.SchemaObject }) {
    Object.entries(components).forEach(([id, schema]) => {
      this.#sharedSchemas.set(id, schema);
    });
  }

  public derefSharedSchema(id: string) {
    return this.#sharedSchemas.get(id);
  }

  public convert(schema: unknown) {
    const unwrapped = this.#unwrapSchema(schema);
    const converter = this.#getConverter(unwrapped)!;
    const { schema: oasSchema, shared } = converter.convert(unwrapped, {
      env: this.#env,
      sharedSchemas: this.#sharedSchemas,
    });

    if (converter === kbnConfigSchemaConverter) {
      const ctx = createCtx({ sharedSchemas: this.#sharedSchemas, env: this.#env });
      Object.entries(shared).forEach(([id, sharedSchema]) => {
        postProcessMutations({ schema: sharedSchema, ctx });
        ctx.addSharedSchema(id, sharedSchema);
      });
      postProcessMutations({ schema: oasSchema as OpenAPIV3.SchemaObject, ctx });
      if (!('$ref' in (oasSchema as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject))) {
        const sourceDescription =
          (unwrapped as { description?: unknown }).description ??
          (
            unwrapped as { getInternalSchema?: () => { description?: unknown } }
          ).getInternalSchema?.().description ??
          (unwrapped as { getSchema?: () => { description?: unknown } }).getSchema?.().description;
        if (
          (oasSchema as OpenAPIV3.SchemaObject).description === undefined &&
          typeof sourceDescription === 'string' &&
          sourceDescription.length > 0
        ) {
          (oasSchema as OpenAPIV3.SchemaObject).description = sourceDescription;
        }
      }
    }

    this.#addComponents(shared);
    return oasSchema as OpenAPIV3.SchemaObject;
  }

  public convertPathParameters(schema: unknown, pathParameters: KnownParameters) {
    const unwrapped = this.#unwrapSchema(schema);
    const opts = { env: this.#env, sharedSchemas: this.#sharedSchemas };
    const converter = this.#getConverter(unwrapped);
    const { params, shared } = converter.convertPathParameters(unwrapped, pathParameters, opts);
    if (converter === kbnConfigSchemaConverter) {
      const ctx = createCtx({ sharedSchemas: this.#sharedSchemas, env: this.#env });
      Object.entries(shared).forEach(([id, sharedSchema]) => {
        postProcessMutations({ schema: sharedSchema, ctx });
        ctx.addSharedSchema(id, sharedSchema);
      });
      params.forEach((param) => {
        if (!param.schema) {
          return;
        }
        postProcessMutations({ schema: param.schema, ctx });
        if (!('$ref' in param.schema)) {
          const schemaDescription = (param.schema as OpenAPIV3.SchemaObject).description;
          if (param.description === undefined && schemaDescription) {
            param.description = schemaDescription;
          }
          delete (param.schema as OpenAPIV3.SchemaObject).description;
        }
      });
    }
    this.#addComponents(shared);
    return params;
  }

  public convertQuery(schema: unknown) {
    const unwrapped = this.#unwrapSchema(schema);
    const opts = { env: this.#env, sharedSchemas: this.#sharedSchemas };
    const converter = this.#getConverter(unwrapped);
    const { query, shared } = converter.convertQuery(unwrapped, opts);
    if (converter === kbnConfigSchemaConverter) {
      const ctx = createCtx({ sharedSchemas: this.#sharedSchemas, env: this.#env });
      Object.entries(shared).forEach(([id, sharedSchema]) => {
        postProcessMutations({ schema: sharedSchema, ctx });
        ctx.addSharedSchema(id, sharedSchema);
      });
      query.forEach((param) => {
        if (!param.schema) {
          return;
        }
        postProcessMutations({ schema: param.schema, ctx });
        if (!('$ref' in param.schema)) {
          const schemaDescription = (param.schema as OpenAPIV3.SchemaObject).description;
          if (param.description === undefined && schemaDescription) {
            param.description = schemaDescription;
          }
          delete (param.schema as OpenAPIV3.SchemaObject).description;
        }
      });
    }
    this.#addComponents(shared);
    return query;
  }

  public getSchemaComponents() {
    return {
      schemas: Object.fromEntries(this.#sharedSchemas.entries()),
    };
  }
}
