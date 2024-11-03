/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A utility function used to validate a table persist data.
 * If any of the properties is not valid, it is returned with undefined value.
 *
 * @param data The data to be validated
 * @param pageSizeOptions The table page size options that are available
 */
export const validatePersistData = (data: any, pageSizeOptions: number[]) => {
  const pageSize = data?.pageSize;
  const sort = data?.sort;

  let validatedPageSize = pageSize;
  let validatedSort = sort;

  if (pageSize && !pageSizeOptions.includes(pageSize)) {
    validatedPageSize = undefined;
  }

  if (sort) {
    const field = sort.field;
    const direction = sort.direction;
    if (typeof field !== 'string' || !['asc', 'desc'].includes(direction)) {
      validatedSort = undefined;
    }
  }

  return { pageSize: validatedPageSize, sort: validatedSort };
};
