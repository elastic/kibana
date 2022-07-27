/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';

export const getApplicableFilters = (dataView: DataView, filterManager: FilterManager) => {
  // We need to exclude scripted filters that are not part of this data view
  // since we can't guarantee they'll succeed for the current data view and
  // can lead to runtime errors
  return filterManager.getFilters().filter((filter) => {
    return filter.meta.index === dataView.id || !filter.query?.script;
  });
};
