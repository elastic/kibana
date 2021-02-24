/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { get } from 'lodash';

import { PanelSchema } from 'src/plugins/vis_type_timeseries/common/types';
import { buildRequestBody } from './table/build_request_body';
import { handleErrorResponse } from './handle_error_response';
import { processBucket } from './table/process_bucket';
import { getEsQueryConfig } from './helpers/get_es_query_uisettings';
import { getIndexPatternObject } from '../search_strategies/lib/get_index_pattern';
import { createFieldsFetcher } from './helpers/fields_fetcher';
import { extractFieldLabel } from '../../../common/calculate_label';
import {
  VisTypeTimeseriesRequestHandlerContext,
  VisTypeTimeseriesVisDataRequest,
} from '../../types';
import { Framework } from '../../plugin';

export async function getTableData(
  requestContext: VisTypeTimeseriesRequestHandlerContext,
  req: VisTypeTimeseriesVisDataRequest,
  panel: PanelSchema,
  framework: Framework
) {
  const panelIndexPattern = panel.index_pattern;

  const strategy = await framework.searchStrategyRegistry.getViableStrategy(
    requestContext,
    req,
    panelIndexPattern
  );

  if (!strategy) {
    throw new Error(
      i18n.translate('visTypeTimeseries.searchStrategyUndefinedErrorMessage', {
        defaultMessage: 'Search strategy was not defined',
      })
    );
  }

  const { searchStrategy, capabilities } = strategy;
  const esQueryConfig = await getEsQueryConfig(req);
  const { indexPatternObject } = await getIndexPatternObject(panelIndexPattern, {
    indexPatternsService: await req.getIndexPatternsService(),
  });

  const extractFields = createFieldsFetcher(req, searchStrategy, capabilities);

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
    const uiSettings = req.getUiSettingsService();
    const body = await buildRequestBody(
      req,
      panel,
      esQueryConfig,
      indexPatternObject,
      capabilities,
      uiSettings
    );

    const [resp] = await searchStrategy.search(req, [
      {
        body,
        index: panelIndexPattern,
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
