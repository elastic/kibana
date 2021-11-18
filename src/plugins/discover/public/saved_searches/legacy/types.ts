/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ISearchSource } from '../../../../data/public';
import type { SavedObjectSaveOpts } from '../../../../saved_objects/public';
import type { DiscoverGridSettings } from '../../application/components/discover_grid/types';

export type SortOrder = [string, string];

/** @deprecated **/
export interface LegacySavedSearch {
  readonly id: string;
  title: string;
  searchSource: ISearchSource;
  description?: string;
  columns: string[];
  sort: SortOrder[];
  grid: DiscoverGridSettings;
  destroy: () => void;
  save: (saveOptions: SavedObjectSaveOpts) => Promise<string>;
  copyOnSave?: boolean;
  hideChart?: boolean;
}

/** @deprecated **/
export interface SavedSearchLoader {
  get: (id: string) => Promise<LegacySavedSearch>;
  urlFor: (id: string) => string;
}
