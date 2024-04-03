/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Pagination } from '@elastic/eui';

export const DEFAULT_DOCS_PER_PAGE = 25;
export const INDEX_DOCUMENTS_META_DEFAULT: Pagination = {
  pageIndex: 0,
  pageSize: DEFAULT_DOCS_PER_PAGE,
  totalItemCount: 0,
};

export * from './pagination';
