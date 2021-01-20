/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IRequestConfig } from 'angular';

const SYSTEM_REQUEST_HEADER_NAME = 'kbn-system-request';
const LEGACY_SYSTEM_API_HEADER_NAME = 'kbn-system-api';

/**
 * Adds a custom header designating request as system API
 * @param originalHeaders Object representing set of headers
 * @return Object representing set of headers, with system API header added in
 */
export function addSystemApiHeader(originalHeaders: Record<string, string>) {
  const systemApiHeaders = {
    [SYSTEM_REQUEST_HEADER_NAME]: true,
  };
  return {
    ...originalHeaders,
    ...systemApiHeaders,
  };
}

/**
 * Returns true if request is a system API request; false otherwise
 *
 * @param request Object Request object created by $http service
 * @return true if request is a system API request; false otherwise
 */
export function isSystemApiRequest(request: IRequestConfig) {
  const { headers } = request;
  return (
    headers && (!!headers[SYSTEM_REQUEST_HEADER_NAME] || !!headers[LEGACY_SYSTEM_API_HEADER_NAME])
  );
}
