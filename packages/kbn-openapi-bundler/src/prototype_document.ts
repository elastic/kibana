/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';

/**
 * `PrototypeDocument` is used as a prototype for the result file.
 * Only specified properties are used. All the other properties will be ignored.
 */
export interface PrototypeDocument {
  /**
   * Defines OpenAPI Info Object to be used in the result document.
   * `bundle()` utility doesn't use `info.version`.
   */
  info?: Partial<OpenAPIV3.InfoObject>;
  /**
   * Defines `servers` to be used in the result document. When `servers`
   * are set existing source documents `servers` aren't included into
   * the result document.
   */
  servers?: OpenAPIV3.ServerObject[];
  /**
   * Defines security requirements to be used in the result document. It must
   * be used together with `components.securitySchemes` When `security`
   * is set existing source documents `security` isn't included into
   * the result document.
   */
  security?: OpenAPIV3.SecurityRequirementObject[];
  components?: {
    /**
     * Defines security schemes for security requirements.
     */
    securitySchemes: Record<string, OpenAPIV3.SecuritySchemeObject>;
  };
  /**
   * Defines tags to be added to the result document. Tags are added to
   * root level tags and prepended to operation object tags.
   */
  tags?: OpenAPIV3.TagObject[];
}
