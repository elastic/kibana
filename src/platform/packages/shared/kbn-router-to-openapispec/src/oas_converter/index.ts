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
    const { schema: oasSchema, shared } = this.#getConverter(unwrapped)!.convert(unwrapped, {
      env: this.#env,
      sharedSchemas: this.#sharedSchemas,
    });
    this.#addComponents(shared);
    return oasSchema as OpenAPIV3.SchemaObject;
  }

  public convertPathParameters(schema: unknown, pathParameters: KnownParameters) {
    const unwrapped = this.#unwrapSchema(schema);
    const { params, shared } = this.#getConverter(unwrapped).convertPathParameters(
      unwrapped,
      pathParameters
    );
    this.#addComponents(shared);
    return params;
  }

  public convertQuery(schema: unknown) {
    const unwrapped = this.#unwrapSchema(schema);
    const { query, shared } = this.#getConverter(unwrapped).convertQuery(unwrapped);
    this.#addComponents(shared);
    return query;
  }

  public getSchemaComponents() {
    return {
      schemas: Object.fromEntries(this.#sharedSchemas.entries()),
    };
  }
}
