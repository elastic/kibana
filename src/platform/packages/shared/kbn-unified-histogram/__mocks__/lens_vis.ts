/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { Suggestion } from '@kbn/lens-plugin/public';
import type { TimeRange } from '@kbn/data-plugin/common';
import type { ChartType } from '@kbn/visualization-utils';
import { LensVisService } from '../services/lens_vis_service';
import { type QueryParams } from '../utils/external_vis_context';
import { unifiedHistogramServicesMock } from './services';
import { histogramESQLSuggestionMock } from './suggestions';
import type { UnifiedHistogramSuggestionContext, UnifiedHistogramVisContext } from '../types';

const TIME_RANGE: TimeRange = {
  from: '2022-11-17T00:00:00.000Z',
  to: '2022-11-17T12:00:00.000Z',
};

export const getLensVisMock = async ({
  filters,
  query,
  columns,
  isPlainRecord,
  timeInterval,
  timeRange,
  breakdownField,
  dataView,
  allSuggestions,
  isTransformationalESQL,
  table,
  externalVisContext,
  getModifiedVisAttributes,
  onLensSuggestionsApiCall,
}: {
  filters: QueryParams['filters'];
  query: QueryParams['query'];
  dataView: QueryParams['dataView'];
  columns: DatatableColumn[];
  isPlainRecord: boolean;
  timeInterval: string;
  timeRange?: TimeRange | null;
  breakdownField: DataViewField | undefined;
  allSuggestions?: Suggestion[];
  isTransformationalESQL?: boolean;
  table?: Datatable;
  externalVisContext?: UnifiedHistogramVisContext;
  getModifiedVisAttributes?: Parameters<LensVisService['update']>[0]['getModifiedVisAttributes'];
  onLensSuggestionsApiCall?: (preferredChartType: ChartType | undefined) => void;
}): Promise<{
  lensService: LensVisService;
  visContext: UnifiedHistogramVisContext | undefined;
  currentSuggestionContext: UnifiedHistogramSuggestionContext | undefined;
}> => {
  const lensApi = await unifiedHistogramServicesMock.lens.stateHelperApi();
  const lensService = new LensVisService({
    services: unifiedHistogramServicesMock,
    lensSuggestionsApi: allSuggestions
      ? (...params) => {
          const context = params[0];
          const preferredChartType = params[3];
          onLensSuggestionsApiCall?.(preferredChartType);
          if ('query' in context && context.query === query) {
            return allSuggestions;
          }
          return !isTransformationalESQL && dataView.isTimeBased()
            ? [histogramESQLSuggestionMock]
            : [];
        }
      : lensApi.suggestions,
  });

  let visContext: UnifiedHistogramVisContext | undefined;
  let currentSuggestionContext: UnifiedHistogramSuggestionContext | undefined;
  lensService.state$.subscribe((state) => {
    visContext = state.visContext;
    currentSuggestionContext = state.currentSuggestionContext;
  });

  lensService.update({
    queryParams: {
      query,
      filters,
      dataView,
      timeRange: timeRange ?? TIME_RANGE,
      columns,
      isPlainRecord,
    },
    timeInterval,
    breakdownField,
    externalVisContext,
    table,
    onSuggestionContextChange: () => {},
    getModifiedVisAttributes,
  });

  return {
    lensService,
    visContext,
    currentSuggestionContext,
  };
};
