/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedSearchAttributes, SavedSearch } from './types';

export const getSavedSearchUrl = (id?: string) => (id ? `#/view/${encodeURIComponent(id)}` : '#/');

export const getSavedSearchFullPathUrl = (id?: string) => `/app/discover${getSavedSearchUrl(id)}`;

export const fromSavedSearchAttributes = (
  id: string,
  attributes: SavedSearchAttributes,
  searchSource: SavedSearch['searchSource']
): SavedSearch => {
  /** to do **/
  return {
    id,
    searchSource,
    title: attributes.title,
    sort: attributes.sort,
    columns: attributes.columns,
    description: attributes.description,
    grid: attributes.grid,
    hideChart: attributes.hideChart,
    //   // @todo: should be removed;
    lastSavedTitle: '',
  };
};

export const toSavedSearchAttributes = (savedSearch: SavedSearch) => {
  /** to do **/
};
