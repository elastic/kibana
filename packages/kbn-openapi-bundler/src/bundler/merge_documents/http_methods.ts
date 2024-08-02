/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';

export const KNOWN_HTTP_METHODS = [
  OpenAPIV3.HttpMethods.HEAD,
  OpenAPIV3.HttpMethods.GET,
  OpenAPIV3.HttpMethods.POST,
  OpenAPIV3.HttpMethods.PATCH,
  OpenAPIV3.HttpMethods.PUT,
  OpenAPIV3.HttpMethods.OPTIONS,
  OpenAPIV3.HttpMethods.DELETE,
  OpenAPIV3.HttpMethods.TRACE,
] as const;
