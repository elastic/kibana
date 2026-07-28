/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const DATA_SOURCE_TYPES = {
  DATA_VIEW: 'dataView',
  DISCOVER_SESSION: 'discoverSession',
} as const;

export type DataSourceType = (typeof DATA_SOURCE_TYPES)[keyof typeof DATA_SOURCE_TYPES];

export interface DiscoverSessionListItem {
  id: string;
  title: string;
  name?: string;
  managed?: boolean;
}
