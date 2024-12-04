/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  type ApiVersion,
  ELASTIC_HTTP_VERSION_HEADER,
  ELASTIC_HTTP_VERSION_QUERY_PARAM,
} from '@kbn/core-http-common';
import { isObject, get } from 'lodash';
import { KibanaRequest } from '@kbn/core-http-server';
import moment from 'moment';
import type { Mutable } from 'utility-types';

const PUBLIC_VERSION_REGEX = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const INTERNAL_VERSION_REGEX = /^[1-9][0-9]*$/;

/**
 * To bring all of Kibana's first public API versions in-sync with an initial
 * release date we only allow one public version temporarily.
 * @internal
 */
export const BASE_PUBLIC_VERSION = '2023-10-31';

export function isAllowedPublicVersion(version: string): undefined | string {
  if (BASE_PUBLIC_VERSION !== version) {
    return `Invalid public version, for now please use "${BASE_PUBLIC_VERSION}" as the version for all public routes. Received "${version}".}"`;
  }
}

/**
 * For public routes we must check that the version is a string that is YYYY-MM-DD.
 * For internal routes we must check that the version is a number.
 * @internal
 */
export function isValidRouteVersion(isPublicApi: boolean, version: string): undefined | string {
  if (isPublicApi) {
    return PUBLIC_VERSION_REGEX.test(version) && moment(version, 'YYYY-MM-DD').isValid()
      ? undefined
      : `Invalid version. Received "${version}", expected a valid date string formatted as YYYY-MM-DD.`;
  }
  return INTERNAL_VERSION_REGEX.test(version) && version !== '0'
    ? undefined
    : `Invalid version number. Received "${version}", expected a string containing _only_ a finite, whole number greater than 0.`;
}

type KibanaRequestWithQueryVersion = KibanaRequest<
  unknown,
  { [ELASTIC_HTTP_VERSION_QUERY_PARAM]: unknown }
>;

export interface RequestLike {
  headers: KibanaRequest['headers'];
  query?: KibanaRequest['query'];
}

export function hasQueryVersion(
  request: Mutable<KibanaRequest>
): request is Mutable<KibanaRequestWithQueryVersion> {
  return isObject(request.query) && ELASTIC_HTTP_VERSION_QUERY_PARAM in request.query;
}
export function removeQueryVersion(request: Mutable<KibanaRequestWithQueryVersion>): void {
  delete request.query[ELASTIC_HTTP_VERSION_QUERY_PARAM];
}

function readQueryVersion(request: RequestLike): undefined | ApiVersion {
  const version = get(request.query, ELASTIC_HTTP_VERSION_QUERY_PARAM);
  if (typeof version === 'string') return version;
}
/** Reading from header takes precedence over query param */
export function readVersion(
  request: RequestLike,
  isQueryVersionEnabled?: boolean
): undefined | ApiVersion {
  const versions = request.headers?.[ELASTIC_HTTP_VERSION_HEADER];
  const headerVersion = Array.isArray(versions) ? versions[0] : versions;
  if (headerVersion) return headerVersion;
  if (isQueryVersionEnabled) return readQueryVersion(request);
}
