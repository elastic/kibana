/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from '../type';
import { KnownParameters, OpenAPIConverter } from '../type';

import { kbnConfigSchemaConverter } from './kbn_config_schema';
import { zodConverter } from './zod';
import { catchAllConverter } from './catch_all';

export class OasConverter {
  readonly #converters: OpenAPIConverter[] = [
    kbnConfigSchemaConverter,
    zodConverter,
    catchAllConverter,
  ];
  readonly #sharedSchemas = new Map<string, OpenAPIV3.SchemaObject>();

  #getConverter(schema: unknown) {
    return this.#converters.find((c) => c.is(schema))!;
  }

  #addComponents(components: { [id: string]: OpenAPIV3.SchemaObject }) {
    Object.entries(components).forEach(([id, schema]) => {
      this.#sharedSchemas.set(id, schema);
    });
  }

  public convert(schema: unknown) {
    const { schema: oasSchema, shared } = this.#getConverter(schema)!.convert(schema);
    this.#addComponents(shared);
    return oasSchema as OpenAPIV3.SchemaObject;
  }

  public convertPathParameters(schema: unknown, pathParameters: KnownParameters) {
    const { params, shared } = this.#getConverter(schema).convertPathParameters(
      schema,
      pathParameters
    );
    this.#addComponents(shared);
    return params;
  }

  public convertQuery(schema: unknown) {
    const { query, shared } = this.#getConverter(schema).convertQuery(schema);
    this.#addComponents(shared);
    return query;
  }

  public getSchemaComponents() {
    return {
      schemas: Object.fromEntries(this.#sharedSchemas.entries()),
    };
  }
}
