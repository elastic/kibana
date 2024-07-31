/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';

/**
 * `PrototypeDocument` is used as a prototype for the result file. In the other words
 * it provides a way to specify the following properties
 *
 * - `info` info object
 * - `servers` servers used to replace `servers` in the source OpenAPI specs
 * - `security` security requirements used to replace `security` in the source OpenAPI specs
 *   It must be specified together with `components.securitySchemes`.
 *
 * All the other properties will be ignored.
 */
export interface PrototypeDocument {
  info?: Partial<OpenAPIV3.InfoObject>;
  servers?: OpenAPIV3.ServerObject[];
  security?: OpenAPIV3.SecurityRequirementObject[];
  components?: {
    securitySchemes: Record<string, OpenAPIV3.SecuritySchemeObject>;
  };
}
