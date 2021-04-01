/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FILTERS, Filter, isQueryStringFilter } from '../../../../../common';

export const mapQueryString = (filter: Filter) => {
  if (isQueryStringFilter(filter)) {
    return {
      type: FILTERS.QUERY_STRING,
      key: 'query',
      value: filter.query.query_string.query,
    };
  }

  throw filter;
};
