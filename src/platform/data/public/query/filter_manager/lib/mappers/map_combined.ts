/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, isCombinedFilter } from '@kbn/es-query';
import { mapFilter } from '../map_filter';

export const mapCombined = (filter: Filter) => {
  if (!isCombinedFilter(filter)) {
    throw filter;
  }

  const { type, key, params } = filter.meta;

  return {
    type,
    key,
    params: params.map(mapFilter),
  };
};
