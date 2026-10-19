/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { UnifiedHistogramChartProps } from '@kbn/unified-histogram';
import { useScopedServices } from '../../../../components/scoped_services_provider';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { fetchEsql } from '../../data_fetching/fetch_esql';
import type { HistogramComparisonContext } from '../../../../context_awareness/types';
import {
  useHistogramComparisonController,
  useOptionalObservable,
} from '../layout/histogram_comparison/use_histogram_comparison_state';

const inspectorTitle = i18n.translate('discover.histogramComparison.inspectorTitle', {
  defaultMessage: 'Pattern comparison',
});

/** Connects the profile's table selection to the histogram as an exact count series. */
export const useHistogramComparison = (
  context: HistogramComparisonContext
): UnifiedHistogramChartProps['comparison'] => {
  const { data, expressions } = useDiscoverServices();
  const { scopedProfilesManager } = useScopedServices();
  const controller = useHistogramComparisonController(context);
  const selection = useOptionalObservable(controller?.selection$);

  return useMemo(() => {
    if (!controller || !selection) {
      return;
    }
    return {
      key: selection.key,
      label: selection.label,
      onResult: controller.onResult,
      loadCounts: async ({ fetchParams, timeField, timeColumn, interval, signal }) => {
        const { dataSource, filters, timeRange, esqlVariables, isApproximate, requestAdapter } =
          fetchParams;
        const response = await fetchEsql({
          query: {
            esql: `${selection.documentQuery} | STATS count = COUNT(*) BY \`${timeColumn}\` = BUCKET(\`${timeField}\`, ${interval})`,
          },
          filters,
          timeRange,
          esqlSource: dataSource.kind === 'esql' ? dataSource : undefined,
          abortSignal: signal,
          inspectorAdapters: { requests: requestAdapter },
          data,
          expressions,
          scopedProfilesManager,
          esqlVariables,
          esqlApproximation: Boolean(isApproximate),
          inspectorConfig: { title: inspectorTitle, description: selection.label },
        });
        return response.records.map((record) => ({
          timestamp: record.flattened[timeColumn] as string | number,
          count: Number(record.flattened.count ?? 0),
        }));
      },
    };
  }, [controller, data, expressions, scopedProfilesManager, selection]);
};
