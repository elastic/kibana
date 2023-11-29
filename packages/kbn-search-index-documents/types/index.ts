/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT = 25;
export const INDEX_DOCUMENTS_META_DEFAULT = {
  page: {
    current: 0,
    size: ENTERPRISE_SEARCH_DOCUMENTS_DEFAULT_DOC_COUNT,
    total_pages: 0,
    total_results: 0,
  },
};

export * from './pagination';
export * from './shared_types';
