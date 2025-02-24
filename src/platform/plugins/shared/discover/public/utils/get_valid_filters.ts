/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { Filter } from '@kbn/es-query';

export const getValidFilters = (dataView: DataView, filters: Filter[]): Filter[] => {
  return filters.map((filter) => {
    const meta = { ...filter.meta };

    // We need to disable scripted filters that don't match this data view
    // since we can't guarantee they'll succeed for the current data view
    // and can lead to runtime errors
    if (filter.query?.script && meta.index !== dataView.id) {
      meta.disabled = true;
    }

    return { ...filter, meta };
  });
};
