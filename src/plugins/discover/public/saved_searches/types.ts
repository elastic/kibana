/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SimpleSavedObject } from '../../../../core/public';
import type { ISearchSource } from '../../../data/public';
import { DiscoverGridSettingsColumn } from '../application/components/discover_grid/types';

/** @internal **/
export interface SavedSearchAttributes extends SimpleSavedObject {
  title: string;
  sort: Array<[string, string]>;
  columns: string[];
  description: string;
  grid: {
    columns?: Record<string, DiscoverGridSettingsColumn>;
  };
  hideChart: boolean;
  kibanaSavedObjectMeta: {
    searchSourceJSON: string;
  };
}

/** @public **/
export interface SavedSearch {
  searchSource: ISearchSource;
  id?: string;
  title?: string;
  sort?: Array<[string, string]>;
  columns?: string[];
  description?: string;
  grid?: {
    columns?: Record<string, DiscoverGridSettingsColumn>;
  };
  hideChart?: boolean;
  // @todo: should be removed;
  lastSavedTitle?: string;
}
