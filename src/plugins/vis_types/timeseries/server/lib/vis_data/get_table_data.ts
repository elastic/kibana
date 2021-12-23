/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import { buildTableRequest } from './table/build_request_body';
import { handleErrorResponse } from './handle_error_response';
import { processBucket } from './table/process_bucket';

import { createFieldsFetcher } from '../search_strategies/lib/fields_fetcher';
import { extractFieldLabel } from '../../../common/fields_utils';
import { isAggSupported } from './helpers/check_aggs';
import { isEntireTimeRangeMode } from './helpers/get_timerange_mode';

import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesRequestServices,
  VisTypeTimeseriesVisDataRequest,
} from '../../types';
import type { Panel } from '../../../common/types';

export async function getTableData(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  req: VisTypeTimeseriesVisDataRequest,
  panel: Panel,
  services: VisTypeTimeseriesRequestServices
) {
  const panelIndex = await services.cachedIndexPatternFetcher(
    panel.index_pattern,
    !panel.use_kibana_indexes
  );

  const strategy = await services.searchStrategyRegistry.getViableStrategy(
    requestContext,
    req,
    panelIndex
  );

  if (!strategy) {
    throw new Error(
      i18n.translate('visTypeTimeseries.searchStrategyUndefinedErrorMessage', {
        defaultMessage: 'Search strategy was not defined',
      })
    );
  }

  const { searchStrategy, capabilities } = strategy;

  const extractFields = createFieldsFetcher(req, {
    indexPatternsService: services.indexPatternsService,
    cachedIndexPatternFetcher: services.cachedIndexPatternFetcher,
    searchStrategy,
    capabilities,
  });

  const calculatePivotLabel = async () => {
    if (panel.pivot_id && panelIndex.indexPattern?.id) {
      const fields = await extractFields({ id: panelIndex.indexPattern.id });

      return extractFieldLabel(fields, panel.pivot_id);
    }
    return panel.pivot_id;
  };

  const meta = {
    type: panel.type,
    uiRestrictions: capabilities.uiRestrictions,
  };

  const handleError = handleErrorResponse(panel);

  try {
    if (isEntireTimeRangeMode(panel)) {
      panel.series.forEach((column) => {
        isAggSupported(column.metrics, capabilities);
      });
    }

    const body = await buildTableRequest({
      req,
      panel,
      esQueryConfig: services.esQueryConfig,
      seriesIndex: panelIndex,
      capabilities,
      uiSettings: services.uiSettings,
      buildSeriesMetaParams: () =>
        services.buildSeriesMetaParams(panelIndex, Boolean(panel.use_kibana_indexes)),
    });

    const [resp] = await searchStrategy.search(requestContext, req, [
      {
        body: {
          ...body,
          runtime_mappings: panelIndex.indexPattern?.getComputedFields().runtimeFields ?? {},
        },
        index: panelIndex.indexPatternString,
      },
    ]);

    const buckets = get(
      resp.rawResponse ? resp.rawResponse : resp,
      'aggregations.pivot.buckets',
      []
    );

    const series = await Promise.all(buckets.map(processBucket({ panel, extractFields })));

    return {
      ...meta,
      pivot_label: panel.pivot_label || (await calculatePivotLabel()),
      series,
    };
  } catch (err) {
    return {
      ...meta,
      ...handleError(err),
    };
  }
}
