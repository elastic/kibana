/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { buildRequestBody } from './table/build_request_body';
import { handleErrorResponse } from './handle_error_response';
import { get } from 'lodash';
import { processBucket } from './table/process_bucket';
import { getEsQueryConfig } from './helpers/get_es_query_uisettings';
import { getIndexPatternObject } from './helpers/get_index_pattern';
import { createFieldsFetcher } from './helpers/fields_fetcher';
import { extractFieldLabel } from '../../../common/calculate_label';

export async function getTableData(req, panel) {
  const panelIndexPattern = panel.index_pattern;

  const {
    searchStrategy,
    capabilities,
  } = await req.framework.searchStrategyRegistry.getViableStrategy(req, panelIndexPattern);
  const esQueryConfig = await getEsQueryConfig(req);
  const { indexPatternObject } = await getIndexPatternObject(req, panelIndexPattern);
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
