/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type {
  AuthHeaders,
  AuthRedirectedParams,
  AuthResult,
  AuthResultAuthenticated,
  AuthResultNotHandled,
  AuthResultParams,
  AuthResultRedirected,
  AuthToolkit,
  AuthenticationHandler,
} from './auth';
export { AuthResultType } from './auth';

export type {
  OnPostAuthHandler,
  OnPostAuthNextResult,
  OnPostAuthToolkit,
  OnPostAuthResult,
} from './on_post_auth';
export { OnPostAuthResultType } from './on_post_auth';

export type {
  OnPreAuthHandler,
  OnPreAuthNextResult,
  OnPreAuthResult,
  OnPreAuthToolkit,
} from './on_pre_auth';
export { OnPreAuthResultType } from './on_pre_auth';

export type {
  OnPreResponseExtensions,
  OnPreResponseHandler,
  OnPreResponseInfo,
  OnPreResponseRender,
  OnPreResponseResult,
  OnPreResponseResultNext,
  OnPreResponseResultRender,
  OnPreResponseToolkit,
} from './on_pre_response';
export { OnPreResponseResultType } from './on_pre_response';

export type {
  OnPreRoutingHandler,
  OnPreRoutingResult,
  OnPreRoutingResultNext,
  OnPreRoutingResultRewriteUrl,
  OnPreRoutingToolkit,
} from './on_pre_routing';
export { OnPreRoutingResultType } from './on_pre_routing';
