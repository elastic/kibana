/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisualizeEditorLayersContext } from '@kbn/visualizations-plugin/public';
import { Series } from '../../../../common/types';

export const convertSplitFilters = (
  series: Series
): Exclude<VisualizeEditorLayersContext['splitFilters'], undefined> => {
  const splitFilters = [];
  if (series.split_mode === 'filter' && series.filter) {
    splitFilters.push({ filter: series.filter });
  }
  if (series.split_filters) {
    splitFilters.push(...series.split_filters);
  }
  return splitFilters;
};
