/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getTableData } from './get_table_data';
import { getSeriesData } from './get_series_data';

export function getPanelData(req) {
  return (panel) => {
    if (panel.type === 'table') {
      return getTableData(req, panel);
    }
    return getSeriesData(req, panel);
  };
}
