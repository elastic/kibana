/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';

export function createBlankOpenApiDocument(
  oasVersion: string,
  overrides?: Partial<OpenAPIV3.Document>
): OpenAPIV3.Document {
  return {
    openapi: oasVersion,
    info: overrides?.info ?? {
      title: 'Merged OpenAPI specs',
      version: 'not specified',
    },
    paths: overrides?.paths ?? {},
    components: {
      schemas: overrides?.components?.schemas,
      responses: overrides?.components?.responses,
      parameters: overrides?.components?.parameters,
      examples: overrides?.components?.examples,
      requestBodies: overrides?.components?.requestBodies,
      headers: overrides?.components?.headers,
      securitySchemes: overrides?.components?.securitySchemes ?? {
        BasicAuth: {
          type: 'http',
          scheme: 'basic',
        },
      },
      links: overrides?.components?.links,
      callbacks: overrides?.components?.callbacks,
    },
    servers: overrides?.servers ?? [
      {
        url: 'http://{kibana_host}:{port}',
        variables: {
          kibana_host: {
            default: 'localhost',
          },
          port: {
            default: '5601',
          },
        },
      },
    ],
    security: overrides?.security ?? [
      {
        BasicAuth: [],
      },
    ],
    tags: overrides?.tags,
    externalDocs: overrides?.externalDocs,
  };
}
