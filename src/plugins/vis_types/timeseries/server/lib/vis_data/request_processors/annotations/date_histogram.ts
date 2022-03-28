/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { overwrite } from '../../helpers';
import { getBucketSize, getTimerange } from '../../helpers';
import { validateField } from '../../../../../common/fields_utils';

import { search, UI_SETTINGS } from '../../../../../../../../plugins/data/server';

import type { AnnotationsRequestProcessorsFunction } from './types';

const { dateHistogramInterval } = search.aggs;

export const dateHistogram: AnnotationsRequestProcessorsFunction = ({
  req,
  panel,
  annotation,
  annotationIndex,
  capabilities,
  uiSettings,
  getMetaParams,
}) => {
  return (next) => async (doc) => {
    const maxBarsUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS);
    const barTargetUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);
    const timeField = annotation.time_field || annotationIndex.indexPattern?.timeFieldName || '';
    const { interval, maxBars } = await getMetaParams();

    if (panel.use_kibana_indexes) {
      validateField(timeField, annotationIndex);
    }

    const { bucketSize, intervalString } = getBucketSize(
      req,
      interval,
      capabilities,
      maxBars ? Math.min(maxBarsUiSettings, maxBars) : barTargetUiSettings
    );

    const { bucketSize: autoBucketSize, intervalString: autoIntervalString } = getBucketSize(
      req,
      'auto',
      capabilities,
      barTargetUiSettings
    );
    const { from, to } = getTimerange(req);
    const { timezone } = capabilities;

    overwrite(doc, `aggs.${annotation.id}.date_histogram`, {
      field: timeField,
      min_doc_count: 0,
      time_zone: timezone,
      extended_bounds: {
        min: from.valueOf(),
        max: to.valueOf(),
      },
      ...dateHistogramInterval(autoBucketSize < bucketSize ? autoIntervalString : intervalString),
    });
    return next(doc);
  };
};
