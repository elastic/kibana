/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DATA_FORMATTERS } from '../../../../common/enums';
import { aggs } from '../../../../common/agg_utils';
import type { Series } from '../../../../common/types';
import type { FieldFormatMap } from '../../../../../../data/common';

export const checkIfSeriesHaveSameFormatters = (
  seriesModel: Series[],
  fieldFormatMap?: FieldFormatMap
) => {
  const uniqFormatters = new Set();

  seriesModel.forEach((seriesGroup) => {
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
        formatter: seriesGroup.formatter,
        value_template: seriesGroup.value_template,
      })
    );
  });

  return uniqFormatters.size === 1;
};
