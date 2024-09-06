/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import 'openapi-types';

// Override the OpenAPI types to add the x-displayName property to the
// tag object.
declare module 'openapi-types' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace OpenAPIV3 {
    interface TagObject {
      'x-displayName'?: string;
    }
  }
}
