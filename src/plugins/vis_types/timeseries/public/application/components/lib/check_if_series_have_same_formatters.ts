/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { last, isEqual } from 'lodash';
import { DATA_FORMATTERS } from '../../../../common/enums';
import type { Series } from '../../../../common/types';
import type { FieldFormatMap } from '../../../../../../data/common';

export const checkIfSeriesHaveSameFormatters = (
  seriesModel: Series[],
  fieldFormatMap?: FieldFormatMap
) => {
  const allSeriesHaveDefaultFormatting = seriesModel.every(
    (seriesGroup) => seriesGroup.formatter === DATA_FORMATTERS.DEFAULT
  );

  return allSeriesHaveDefaultFormatting && fieldFormatMap
    ? seriesModel
        .map(({ metrics }) => fieldFormatMap[last(metrics)?.field ?? ''])
        .every((fieldFormat, index, [firstSeriesFieldFormat]) =>
          isEqual(fieldFormat, firstSeriesFieldFormat)
        )
    : seriesModel.every(
        (series) =>
          series.formatter === seriesModel[0].formatter &&
          series.value_template === seriesModel[0].value_template
      );
};
