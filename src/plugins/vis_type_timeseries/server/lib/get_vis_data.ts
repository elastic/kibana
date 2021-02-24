/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _ from 'lodash';

import { getPanelData } from './vis_data/get_panel_data';
import { Framework } from '../plugin';
import { TimeseriesVisData } from '../../common/types';
import type {
  VisTypeTimeseriesVisDataRequest,
  VisTypeTimeseriesRequestHandlerContext,
} from '../types';

export function getVisData(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  request: VisTypeTimeseriesVisDataRequest,
  framework: Framework
): Promise<TimeseriesVisData> {
  const promises = request.body.panels.map(getPanelData(request));
  return Promise.all(promises).then((res) => {
    return res.reduce((acc, data) => {
      return _.assign(acc as any, data);
    }, {});
  }) as Promise<TimeseriesVisData>;
}
