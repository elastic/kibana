/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { useDiscoverServices } from './use_discover_services';

const DISCOVER_CHART_ID = 'discover_session';

export type UseRecordCursorReturn = (record: DataTableRecord | undefined) => void;

export const useRecordCursorInCharts = (dataView: DataView): UseRecordCursorReturn => {
  const { charts } = useDiscoverServices();

  return useCallback(
    (record) => {
      const commonProps = {
        accessors: [`${dataView.getIndexPattern()}:${dataView.timeFieldName}`],
        isDateHistogram: true,
      };

      if (!record) {
        charts.activeCursor.activeCursor$?.next({
          ...commonProps,
          cursor: {
            chartId: DISCOVER_CHART_ID,
            type: 'Out',
          },
        });
        return;
      }

      const timestampValue = dataView.timeFieldName
        ? record?.flattened[dataView.timeFieldName]
        : undefined;
      const timestamp = Array.isArray(timestampValue) ? timestampValue[0] : timestampValue;
      const x = timestamp ? new Date(timestamp).getTime() : undefined;

      if (x) {
        charts.activeCursor.activeCursor$?.next({
          ...commonProps,
          cursor: {
            chartId: DISCOVER_CHART_ID,
            type: 'Over',
            scale: 'time',
            x,
            y: [{ value: 0, groupId: 'left' }],
            smVerticalValue: null,
            smHorizontalValue: null,
          },
        });
      }
    },
    [dataView, charts]
  );
};
