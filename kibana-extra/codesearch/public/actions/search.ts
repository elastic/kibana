/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

export interface DocumentSearchPayload {
  query: string;
  page?: number;
  languages?: string;
  repositories?: string;
}

// For document search page
export const documentSearch = createAction<DocumentSearchPayload>('DOCUMENT SEARCH');
export const documentSearchSuccess = createAction<string>('DOCUMENT SEARCH SUCCESS');
export const documentSearchFailed = createAction<string>('DOCUMENT SEARCH FAILED');

// For symbol search typeahead
export const symbolSearchQueryChanged = createAction<string>('SYMBOL SEARCH QUERY CHANGED');
export const symbolSearchSuccess = createAction<string>('SYMBOL SEARCH SUCCESS');
export const symbolSearchFailed = createAction<string>('SYMBOL SEARCH FAILED');
