/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { convertIntervalIntoUnit } from './get_interval';
import { i18n } from '@kbn/i18n';

export function getAxisLabelString(interval) {
  if (!interval) {
    return '';
  }

  const convertedValue = convertIntervalIntoUnit(interval);

  if (convertedValue) {
    return i18n.translate('visTypeTimeseries.axisLabelOptions.axisLabel', {
      defaultMessage: 'per {unitValue} {unitString}',
      values: {
        unitValue: convertedValue.unitValue,
        unitString: convertedValue.unitString,
      },
    });
  }
}
