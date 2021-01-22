/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { newMetricAggFn } from './new_metric_agg_fn';
import { isBasicAgg } from '../../../../common/agg_lookup';
import { handleAdd, handleChange } from './collection_actions';

export const seriesChangeHandler = (props, items) => (doc) => {
  // If we only have one sibling and the user changes to a pipeline
  // agg we are going to add the pipeline instead of changing the
  // current item.
  if (items.length === 1 && !isBasicAgg(doc)) {
    handleAdd.call(null, props, () => {
      const metric = newMetricAggFn();
      metric.type = doc.type;

      if (!['calculation', 'series_agg'].includes(doc.type)) {
        metric.field = doc.id;
      }
      return metric;
    });
  } else {
    handleChange.call(null, props, doc);
  }
};
