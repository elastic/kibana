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
  info: OpenAPIV3.InfoObject
): OpenAPIV3.Document {
  return {
    openapi: oasVersion,
    info,
    servers: [
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
    security: [
      {
        BasicAuth: [],
      },
    ],
    paths: {},
    components: {
      securitySchemes: {
        BasicAuth: {
          type: 'http',
          scheme: 'basic',
        },
      },
    },
  };
}
