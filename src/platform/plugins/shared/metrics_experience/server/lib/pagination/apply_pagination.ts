/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function applyPagination<T>({
  metricFields,
  page,
  size,
}: {
  metricFields: T[];
  page: number;
  size: number;
}) {
  // For the first page, we need to start at Zero, for the remaining pages
  // offset by 1 then multiply by size
  const start = page === 1 ? page - 1 : (page - 1) * size;
  const end = page * size;
  return metricFields.slice(start, end);
}
