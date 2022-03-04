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
import { getFieldsForTerms, getMultiFieldLabel } from '../../../common/fields_utils';
import { isAggSupported } from './helpers/check_aggs';
import { isConfigurationFeatureEnabled } from '../../../common/check_ui_restrictions';
import { FilterCannotBeAppliedError, PivotNotSelectedForTableError } from '../../../common/errors';

import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesRequestServices,
  VisTypeTimeseriesVisDataRequest,
} from '../../types';
import type { Panel, DataResponseMeta } from '../../../common/types';
import type { EsSearchRequest } from '../search_strategies';

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
    const pivotIds = getFieldsForTerms(panel.pivot_id);

    if (pivotIds.length) {
      const fields = panelIndex.indexPattern?.id
        ? await extractFields({ id: panelIndex.indexPattern.id })
        : [];

      return getMultiFieldLabel(pivotIds, fields);
    }
  };

  const meta: DataResponseMeta = {
    type: panel.type,
    uiRestrictions: capabilities.uiRestrictions,
    trackedEsSearches: {},
  };
  const handleError = handleErrorResponse(panel);

  try {
    panel.series.forEach((series) => {
      isAggSupported(series.metrics, capabilities);
      if (series.filter?.query && !isConfigurationFeatureEnabled('filter', capabilities)) {
        throw new FilterCannotBeAppliedError();
      }
    });

    if (!getFieldsForTerms(panel.pivot_id).length) {
      throw new PivotNotSelectedForTableError();
    }

    const searches: EsSearchRequest[] = [
      {
        index: panelIndex.indexPatternString,
        body: {
          ...(await buildTableRequest({
            req,
            panel,
            esQueryConfig: services.esQueryConfig,
            seriesIndex: panelIndex,
            capabilities,
            uiSettings: services.uiSettings,
            buildSeriesMetaParams: () =>
              services.buildSeriesMetaParams(panelIndex, Boolean(panel.use_kibana_indexes)),
          })),
          runtime_mappings: panelIndex.indexPattern?.getComputedFields().runtimeFields ?? {},
        },
        trackingEsSearchMeta: {
          requestId: panel.id,
          requestLabel: i18n.translate('visTypeTimeseries.tableRequest.label', {
            defaultMessage: 'Table: {id}',
            values: {
              id: panel.id,
            },
          }),
        },
      },
    ];

    const data = await searchStrategy.search(requestContext, req, searches, meta.trackedEsSearches);

    const buckets = get(
      data[0].rawResponse ? data[0].rawResponse : data[0],
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
