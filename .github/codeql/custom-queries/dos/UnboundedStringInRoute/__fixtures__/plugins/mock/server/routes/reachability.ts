/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Route-reachability cases for the custom route wrappers. Strings that reach a
// request-validation position are flagged ($ Alert); response schemas and
// non-route schemas are not.
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod';
import { CrossFileRequest, CrossFileZodBody, BaseReq } from './reachability_schemas';

declare const router: any;
declare const handler: any;
declare function createServerRoute(cfg: any): any;
declare function createCasesRoute(cfg: any): any;
declare function buildRouteValidationWithZod(s: any): any;

// @kbn/server-route-repository: `params` holds the request schema.
createServerRoute({
  path: '/api/reach/srr',
  params: schema.object({
    body: schema.object({ srrBody: schema.string() }), // $ Alert
  }),
  handler,
});

// cases: `createCasesRoute({ params: { body, ... } })`.
createCasesRoute({
  params: { body: schema.object({ casesBody: schema.string() }) }, // $ Alert
  handler,
});

// alerting_v2: `static schemas = { request, response }`.
class MyRoute {
  static schemas = {
    request: { body: z.object({ av2Body: z.string() }) }, // $ Alert
    response: { 200: { body: z.object({ av2Resp: z.string() }) } }, // response -> NOT flagged
  };
}

// versioned router + buildRouteValidationWithZod wrapper (cross-file zod schema).
router.versioned.post({ path: '/api/reach/wrap' }).addVersion(
  {
    version: '1',
    validate: { request: { body: buildRouteValidationWithZod(CrossFileZodBody) } },
  },
  handler
);

// object spread: `validate: { ...rt }`.
const rt = { body: schema.object({ spreadBody: schema.string() }) }; // $ Alert
router.post({ path: '/api/reach/spread', validate: { ...rt } }, handler);

// `.extends` composition: base receiver + extension fields.
router.post(
  {
    path: '/api/reach/extends',
    validate: { body: BaseReq.extends({ extField: schema.string() }) },
  }, // $ Alert
  handler
);

// cross-file grouping bound to `validate: { request: <imported> }`.
router.post({ path: '/api/reach/crossfile', validate: { request: CrossFileRequest } }, handler);

// RESPONSE schema -> must NOT be flagged.
router.post(
  {
    path: '/api/reach/response',
    validate: { response: { 200: { body: schema.object({ respOnly: schema.string() }) } } },
  },
  handler
);

// Non-route schema -> must NOT be flagged.
export const internalOnly = schema.object({ internal: schema.string() });
