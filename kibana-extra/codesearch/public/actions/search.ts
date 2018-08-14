/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { createAction } from 'redux-actions';

// TODO: rename these actions to symbol search
export const searchQueryChanged = createAction<string>('SEARCH QUERY CHANGED');
export const searchSuccess = createAction<string>('SEARCH SUCCESS');
export const searchFailed = createAction<string>('SEARCH FAILED');

// For full search page
export const fullSearch = createAction<string>('FULL SEARCH');
export const fullSearchSuccess = createAction<string>('FULL SEARCH SUCCESS');
export const fullSearchFailed = createAction<string>('FULL SEARCH FAILED');
