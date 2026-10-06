/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ELASTIC_HTTP_VERSION_QUERY_PARAM } from '@kbn/core-http-common';
import { type ApiVersion } from '@kbn/core-http-common';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { Mutable } from 'utility-types';
/**
 * To bring all of Kibana's first public API versions in-sync with an initial
 * release date we only allow one public version temporarily.
 * @internal
 */
export declare const BASE_PUBLIC_VERSION = '2023-10-31';
export declare function isAllowedPublicVersion(version: string): undefined | string;
/**
 * For public routes we must check that the version is a string that is YYYY-MM-DD.
 * For internal routes we must check that the version is a number.
 * @internal
 */
export declare function isValidRouteVersion(
  isPublicApi: boolean,
  version: string
): undefined | string;
type KibanaRequestWithQueryVersion = KibanaRequest<
  unknown,
  {
    [ELASTIC_HTTP_VERSION_QUERY_PARAM]: unknown;
  }
>;
export interface RequestLike {
  headers: KibanaRequest['headers'];
  query?: KibanaRequest['query'];
}
export declare function hasQueryVersion(
  request: RequestLike
): request is Mutable<KibanaRequestWithQueryVersion>;
export declare function removeQueryVersion(request: RequestLike): void;
/** Reading from header takes precedence over query param */
export declare function readVersion(
  request: RequestLike,
  isQueryVersionEnabled?: boolean
): undefined | ApiVersion;
export {};
