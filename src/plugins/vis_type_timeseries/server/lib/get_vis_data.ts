/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { Framework } from '../plugin';
import { TimeseriesVisData } from '../../common/types';
import type {
  VisTypeTimeseriesVisDataRequest,
  VisTypeTimeseriesRequestHandlerContext,
} from '../types';
import { getSeriesData } from './vis_data/get_series_data';
import { getTableData } from './vis_data/get_table_data';

export function getVisData(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  request: VisTypeTimeseriesVisDataRequest,
  framework: Framework
): Promise<TimeseriesVisData> {
  const promises = request.body.panels.map((panel) => {
    if (panel.type === 'table') {
      return getTableData(requestContext, request, panel, framework);
    }
    return getSeriesData(requestContext, request, panel, framework);
  });

  return Promise.all(promises).then((res) => {
    return res.reduce((acc, data) => {
      return _.assign(acc, data);
    }, {});
  }) as Promise<TimeseriesVisData>;
}
