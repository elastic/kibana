/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {} from '@hapi/hapi';

// Same override as in `@kbn/core-http-server` (src/core/packages/http/server/src/router/raw_request.ts),
// which this standalone dev-mode package does not depend on.
declare module '@hapi/hapi' {
  interface ReqRefDefaults {
    Headers: Record<string, string | string[] | undefined>;
    Query: { [key: string]: string | string[] | undefined };
    Params: Record<string, string>;
  }
}
