/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VisualizeEditorLayersContext } from '@kbn/visualizations-plugin/public';
import { Series } from '../../../../common/types';
import { Filter } from '../../types';

export const convertFilter = (series: Series): Filter | void => {
  if (!series.filter) {
    return;
  }

  if (series.filter.language === 'kuery') {
    return { kql: series.filter.query };
  }

  if (series.filter.language === 'lucene') {
    return { lucene: series.filter.query };
  }
};

const convertMetric = (
  series: Series,
  metric: VisualizeEditorLayersContext['metrics'][number],
  filter: Filter | void,
  interval?: string
) => ({
  ...metric,
  color: metric.color ?? series.color,
  params: {
    ...metric.params,
    ...(series.offset_time && { shift: series.offset_time }),
    ...(filter && filter),
    ...(interval && { window: interval }),
  },
});

export const convertMetrics = (
  series: Series,
  metrics: VisualizeEditorLayersContext['metrics'],
  filter: Filter | void,
  interval?: string
) => metrics.map((metric) => convertMetric(series, metric, filter, interval));
