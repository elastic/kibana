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
import { getIndexPatternObject } from '../search_strategies/lib/get_index_pattern';
import { createFieldsFetcher } from './helpers/fields_fetcher';
import { extractFieldLabel } from '../../../common/calculate_label';
import type {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesRequestServices,
  VisTypeTimeseriesVisDataRequest,
} from '../../types';
import type { PanelSchema } from '../../../common/types';

export async function getTableData(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  req: VisTypeTimeseriesVisDataRequest,
  panel: PanelSchema,
  services: VisTypeTimeseriesRequestServices
) {
  const { indexPatternObject, indexPatternString } = await getIndexPatternObject(
    panel.index_pattern,
    {
      indexPatternsService: services.indexPatternsService,
    }
  );

  const strategy = await services.searchStrategyRegistry.getViableStrategy(
    requestContext,
    req,
    indexPatternString
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
    searchStrategy,
    capabilities,
  });

  const calculatePivotLabel = async () => {
    if (panel.pivot_id && indexPatternObject?.title) {
      const fields = await extractFields(indexPatternObject.title);

      return extractFieldLabel(fields, panel.pivot_id);
    }
    return panel.pivot_id;
  };

  const meta = {
    type: panel.type,
    pivot_label: panel.pivot_label || (await calculatePivotLabel()),
    uiRestrictions: capabilities.uiRestrictions,
  };

  try {
    const body = await buildRequestBody(
      req,
      panel,
      services.esQueryConfig,
      indexPatternObject,
      capabilities,
      services.uiSettings
    );

    const [resp] = await searchStrategy.search(requestContext, req, [
      {
        body,
        index: indexPatternString,
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
      series,
    };
  } catch (err) {
    if (err.body || err.name === 'KQLSyntaxError') {
      err.response = err.body;

      return {
        ...meta,
        ...handleErrorResponse(panel)(err),
      };
    }
  }
}
