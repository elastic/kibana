/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

  if (pageSize) {
    if (typeof pageSize !== 'number' || !pageSizeOptions.includes(pageSize)) {
      validatedPageSize = undefined;
    }
  }

  if (sort) {
    const field = sort.field;
    const direction = sort.direction;
    if (!field || typeof field !== 'string' || !direction || !['asc', 'desc'].includes(direction)) {
      validatedSort = undefined;
    }
  }

  return { pageSize: validatedPageSize, sort: validatedSort };
};
