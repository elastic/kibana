/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';

export function createOASDocument(overrides: {
  openapi?: string;
  info?: Partial<OpenAPIV3.InfoObject>;
  paths?: OpenAPIV3.PathsObject;
  components?: OpenAPIV3.ComponentsObject;
  servers?: OpenAPIV3.ServerObject[];
  security?: OpenAPIV3.SecurityRequirementObject[];
  tags?: OpenAPIV3.TagObject[];
}): OpenAPIV3.Document {
  const document: OpenAPIV3.Document = {
    openapi: overrides.openapi ?? '3.0.3',
    info: {
      title: 'Test endpoint',
      version: '2023-10-31',
      ...overrides.info,
    },
    paths: {
      ...overrides.paths,
    },
    components: {
      ...overrides.components,
    },
  };

  if (overrides.servers) {
    document.servers = overrides.servers;
  }

  if (overrides.security) {
    document.security = overrides.security;
  }

  if (overrides.tags) {
    document.tags = overrides.tags;
  }

  return document;
}
