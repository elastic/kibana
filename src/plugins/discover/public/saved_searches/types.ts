/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SearchSource } from '../../../data/public';
import { SavedObjectSaveOpts } from '../../../saved_objects/public';
import { DiscoverGridSettings } from '../application/components/discover_grid/types';

export type SortOrder = [string, string];
export interface SavedSearch {
  readonly id: string;
  title: string;
  searchSource: SearchSource;
  description?: string;
  columns: string[];
  sort: SortOrder[];
  grid: DiscoverGridSettings;
  destroy: () => void;
  save: (saveOptions: SavedObjectSaveOpts) => Promise<string>;
  lastSavedTitle?: string;
  copyOnSave?: boolean;
  pre712?: boolean;
  hideChart?: boolean;
}
export interface SavedSearchLoader {
  get: (id: string) => Promise<SavedSearch>;
  urlFor: (id: string) => string;
}
