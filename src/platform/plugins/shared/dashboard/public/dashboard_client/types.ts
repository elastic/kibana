/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { SavedObjectsFindOptionsReference } from '@kbn/core/public';

import type {
  DashboardSearchOptions,
  DashboardSearchAPIResult,
  DashboardState,
} from '../../server/content_management';

export interface SearchDashboardsArgs {
  options?: DashboardSearchOptions;
  hasNoReference?: SavedObjectsFindOptionsReference[];
  hasReference?: SavedObjectsFindOptionsReference[];
  search: string;
  size: number;
}

export interface SearchDashboardsResponse {
  total: number;
  hits: DashboardSearchAPIResult['hits'];
}

/**
 * Types for Finding Dashboards
 */

export type FindDashboardsByIdResponse = { id: string } & (
  | { status: 'success'; attributes: DashboardState; references: Reference[] }
  | { status: 'error'; notFound: boolean; error: Error }
);

export interface FindDashboardsService {
  search: (
    props: Pick<
      SearchDashboardsArgs,
      'hasReference' | 'hasNoReference' | 'search' | 'size' | 'options'
    >
  ) => Promise<SearchDashboardsResponse>;
  findById: (id: string) => Promise<FindDashboardsByIdResponse>;
  findByIds: (ids: string[]) => Promise<FindDashboardsByIdResponse[]>;
  findByTitle: (title: string) => Promise<{ id: string } | undefined>;
}
