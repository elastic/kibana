/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';

export const getValidFilters = (dataView: DataView, filters: Filter[]): Filter[] => {
  // We need to disable scripted filters that are not part of this data view
  // since we can't guarantee they'll succeed for the current data view and
  // can lead to runtime errors
  return filters.map((filter) => {
    return {
      ...filter,
      meta: {
        ...filter.meta,
        disabled:
          filter.meta.disabled ||
          (filter.meta.index !== dataView.id && Boolean(filter.query?.script)),
      },
    };
  });
};
