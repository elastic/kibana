/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

// not typed yet
// @ts-expect-error
import { buildRequestBody } from './table/build_request_body';
// @ts-expect-error
import { handleErrorResponse } from './handle_error_response';
// @ts-expect-error
import { processBucket } from './table/process_bucket';

import { createFieldsFetcher } from '../search_strategies/lib/fields_fetcher';
import { extractFieldLabel } from '../../../common/fields_utils';
import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesRequestServices,
  VisTypeTimeseriesVisDataRequest,
} from '../../types';
import type { Panel } from '../../../common/types';
import { getIntervalAndTimefield } from './get_interval_and_timefield';

export async function getTableData(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  req: VisTypeTimeseriesVisDataRequest,
  panel: Panel,
  services: VisTypeTimeseriesRequestServices
) {
  const panelIndex = await services.cachedIndexPatternFetcher(panel.index_pattern);

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

  const buildSeriesMetaParams = async () => {
    let index = panelIndex;

    /** This part of code is required to try to get the default timefield for string indices.
     *  The rest of the functionality available for Kibana indexes should not be active **/
    if (!panel.use_kibana_indexes && index.indexPatternString) {
      index = await services.cachedIndexPatternFetcher(index.indexPatternString, true);
    }

    return getIntervalAndTimefield(panel, index);
  };

  const meta = {
    type: panel.type,
    uiRestrictions: capabilities.uiRestrictions,
  };

  try {
    const body = await buildRequestBody(
      req,
      panel,
      services.esQueryConfig,
      panelIndex,
      capabilities,
      services.uiSettings,
      buildSeriesMetaParams
    );

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

    const series = await Promise.all(
      buckets.map(processBucket(panel, req, searchStrategy, capabilities, extractFields))
    );

    return {
      ...meta,
      pivot_label: panel.pivot_label || (await calculatePivotLabel()),
      series,
    };
  } catch (err) {
    if (err.body) {
      err.response = err.body;

      return {
        ...meta,
        ...handleErrorResponse(panel)(err),
      };
    }
    return meta;
  }
}
