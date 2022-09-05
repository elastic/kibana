/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { Column } from '../../common';
import { convertMetricToColumns } from '../../common/convert_to_lens/lib/metrics';
import { Vis } from '../types';
import { getVisSchemas } from '../vis_schemas';

export const getColumnsFromVis = <T>(
  vis: Vis<T>,
  timefilter: TimefilterContract,
  dataView: DataView
) => {
  const { metric } = getVisSchemas(vis, {
    timefilter,
    timeRange: timefilter.getAbsoluteTime(),
  });

  const metricColumns = metric.flatMap((m) => convertMetricToColumns(m, dataView));
  if (metricColumns.includes(null)) {
    return null;
  }

  const columns = [...(metricColumns as Column[])];
  return columns;
};
