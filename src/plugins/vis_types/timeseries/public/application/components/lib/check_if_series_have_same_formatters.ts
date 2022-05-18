/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { FieldFormatMap } from '@kbn/data-plugin/common';
import { DATA_FORMATTERS } from '../../../../common/enums';
import { aggs } from '../../../../common/agg_utils';
import type { Series } from '../../../../common/types';

export const checkIfSeriesHaveSameFormatters = (
  seriesModel: Series[],
  fieldFormatMap?: FieldFormatMap
) => {
  const uniqFormatters = new Set();

  seriesModel.forEach((seriesGroup) => {
    if (!seriesGroup.separate_axis) {
      if (seriesGroup.formatter === DATA_FORMATTERS.DEFAULT) {
        const activeMetric = seriesGroup.metrics[seriesGroup.metrics.length - 1];
        const aggMeta = aggs.find((agg) => agg.id === activeMetric.type);

        if (
          activeMetric.field &&
          aggMeta?.meta.isFieldRequired &&
          fieldFormatMap?.[activeMetric.field]
        ) {
          return uniqFormatters.add(JSON.stringify(fieldFormatMap[activeMetric.field]));
        }
      }
      uniqFormatters.add(
        JSON.stringify({
          // requirement: in the case of using TSVB formatters, we do not need to check the value_template, just formatter!
          formatter: seriesGroup.formatter,
        })
      );
    }
  });

  return uniqFormatters.size === 1;
};
