/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import moment from 'moment';
import { AUTO_INTERVAL } from '../../../common/constants';
import { validateField } from '../../../common/fields_utils';
import { validateInterval } from '../../../common/validate_interval';
import { TimeFieldNotSpecifiedError } from '../../../common/errors';

import type { FetchedIndexPattern, Panel, Series } from '../../../common/types';

interface IntervalParams {
  min: string;
  max: string;
  maxBuckets: number;
}

export function getIntervalAndTimefield(
  panel: Panel,
  index: FetchedIndexPattern,
  { min, max, maxBuckets }: IntervalParams,
  series?: Series
) {
  let timeField =
    (series?.override_index_pattern ? series.series_time_field : panel.time_field) ||
    index.indexPattern?.timeFieldName;

  // should use @timestamp as default timeField for es indeces if user doesn't provide timeField
  if (!panel.use_kibana_indexes && !timeField) {
    timeField = '@timestamp';
  }

  if (panel.use_kibana_indexes) {
    if (timeField) {
      validateField(timeField, index);
    } else {
      throw new TimeFieldNotSpecifiedError();
    }
  }

  let interval = panel.interval;
  let maxBars = panel.max_bars;

  if (series?.override_index_pattern) {
    interval = series.series_interval || AUTO_INTERVAL;
    maxBars = series.series_max_bars;
  }

  validateInterval(
    {
      min: moment.utc(min),
      max: moment.utc(max),
    },
    interval,
    maxBuckets
  );

  return {
    maxBars,
    timeField,
    interval: interval || AUTO_INTERVAL,
  };
}
