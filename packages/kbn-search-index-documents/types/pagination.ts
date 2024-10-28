/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function pageToPagination(page: { from: number; size: number; total: number }) {
  // Prevent divide-by-zero-error
  const pageIndex = page.size ? Math.trunc(page.from / page.size) : 0;
  return {
    pageIndex,
    pageSize: page.size,
    totalItemCount: page.total,
  };
}
interface Page {
  from: number; // current page index, 0-based
  has_more_hits_than_total?: boolean;
  size: number; // size per page
  total: number; // total number of hits
}
interface Meta {
  page: Page;
}
export interface Paginate<T> {
  _meta: Meta;
  data: T[];
}
