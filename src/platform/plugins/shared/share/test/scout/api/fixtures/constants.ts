/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const SHORT_URL_API_PATH = 'api/short_url';
export const LEGACY_SHORT_URL_LOCATOR_ID = 'LEGACY_SHORT_URL_LOCATOR';

export const COMMON_HEADERS = {
  'kbn-xsrf': 'short-url-scout',
} as const;
