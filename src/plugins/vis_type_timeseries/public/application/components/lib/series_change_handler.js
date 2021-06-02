/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { newMetricAggFn } from './new_metric_agg_fn';
import { isBasicAgg } from '../../../../common/agg_lookup';
import { handleAdd, handleChange } from './collection_actions';

export const seriesChangeHandler = (props, items) => (doc, part) => {
  // For Sibling Pipeline / Special aggregations, the field is used as a reference to the target aggregation.
  // In these cases, an error occurs when switching to standard aggregation type.
  // We should set an empty value for the "field" when switching the agg type
  if (part.type && doc.field) {
    doc.field = null;
  }

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
