/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line import/no-extraneous-dependencies
export * from 'openapi-types';

declare module 'openapi-types' {
  export namespace OpenAPIV3 {
    export interface BaseSchemaObject {
      // Custom OpenAPI field added by Kibana for a new field at the schema level.
      'x-discontinued'?: string;
    }
  }
}
