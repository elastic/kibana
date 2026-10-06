/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Lifecycle } from '@hapi/hapi';
import type { Logger } from '@kbn/logging';
export declare const SELF_CALL_HEADER = 'x-kbn-self-call';
/**
 * Response header Core stamps on a 401 raised by the authentication lifecycle, and only on a
 * self call. It tells the self client that the rejection happened before routing, so the route
 * handler probably did not run and the call can be safely replayed with a refreshed credential.
 * A 401 a route handler produced itself (see the Elasticsearch 401 forwarding in the router) is
 * indistinguishable by status or `www-authenticate` alone, and replaying it could duplicate a
 * side effect the handler already performed.
 */
export declare const SELF_CALL_AUTH_CHALLENGE_HEADER = 'x-kbn-self-call-auth-challenge';
export declare const SELF_CALL_OBSERVED_EVENT_ACTION = 'kibana_self_http_request';
export declare const createSelfCallPreHandler: () => Lifecycle.Method;
export declare const createSelfCallPreResponseHandler: (log: Logger) => Lifecycle.Method;
