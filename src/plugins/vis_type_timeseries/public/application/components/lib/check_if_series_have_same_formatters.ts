/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last } from 'lodash';
import type { Series } from '../../../../common/types';
import type { FieldFormatMap } from '../../../../../data/common';

export const checkIfSeriesHaveSameFormatters = (
  seriesModel: Series[],
  fieldFormatMap: FieldFormatMap
) => {
  const allSeriesHaveSameIgnoreFieldFormatting = seriesModel.every(
    (seriesGroup) => seriesGroup.ignore_field_formatting === seriesModel[0].ignore_field_formatting
  );

  if (allSeriesHaveSameIgnoreFieldFormatting) {
    return seriesModel[0].ignore_field_formatting
      ? seriesModel.every(
          (series) =>
            series.formatter === seriesModel[0].formatter &&
            series.value_template === seriesModel[0].value_template
        )
      : seriesModel
          .map(({ metrics }) => fieldFormatMap[last(metrics)?.field ?? ''])
          .every(
            (fieldFormat, index, [firstSeriesFieldFormat]) =>
              JSON.stringify(fieldFormat) === JSON.stringify(firstSeriesFieldFormat)
          );
  }

  return false;
};
