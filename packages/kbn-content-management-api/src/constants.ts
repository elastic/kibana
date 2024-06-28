/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const API_CONTENT_PATH = '/api/{appName}/{contentId}';

export const SPECIFIC_ITEM_PATH = `${API_CONTENT_PATH}/{id}`;

export const MAYBE_SPECIFIC_ITEM_PATH = `${API_CONTENT_PATH}/{id?}`;

export const contentManagementApiVersions = {
  '2023-10-31': '2023-10-31',
  '2024-06-24': '2024-06-24',
} as const;
