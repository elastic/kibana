/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request } from '@hapi/hapi';
import type { KibanaRequestState } from '@kbn/core-http-server';

/**
 * Records the original URL on the first rewrite of a request so handlers can
 * recover it later, and applies the new URL via Hapi's setUrl.
 * @internal
 */
export const setRewrittenUrl = (request: Request, newUrl: string): void => {
  const app = request.app as KibanaRequestState;
  app.rewrittenUrl = app.rewrittenUrl ?? request.url;
  request.setUrl(newUrl);
};
