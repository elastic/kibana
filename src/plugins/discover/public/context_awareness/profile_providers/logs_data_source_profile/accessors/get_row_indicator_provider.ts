/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  getLogLevelCoalescedValue,
  getLogLevelCoalescedValueLabel,
  getLogLevelColor,
} from '@kbn/discover-utils';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import { LOG_LEVEL_FIELDS } from '../../../../../common/data_types/logs/constants';
import type { DataSourceProfileProvider } from '../../../profiles';

export const getRowIndicatorProvider: DataSourceProfileProvider['profile']['getRowIndicatorProvider'] =

    () =>
    ({ dataView }) => {
      // Check if the data view has any of the log level fields.
      if (!LOG_LEVEL_FIELDS.some((field) => dataView.getFieldByName(field))) {
        // Otherwise, don't set the row indicator color so the color indicator control column is not added to the grid at all.
        return undefined;
      }
      return getRowIndicator;
    };

const getRowIndicator: UnifiedDataTableProps['getRowIndicator'] = (row, euiTheme) => {
  const logLevel = LOG_LEVEL_FIELDS.reduce((acc: unknown, field) => {
    return acc || row.flattened[field];
  }, undefined);

  const logLevelCoalescedValue = getLogLevelCoalescedValue(logLevel);

  if (logLevelCoalescedValue) {
    const color = getLogLevelColor(logLevelCoalescedValue, euiTheme);

    if (!color) {
      return undefined;
    }

    return {
      color,
      label: getLogLevelCoalescedValueLabel(logLevelCoalescedValue),
    };
  }

  return undefined;
};
