/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildRequestBody } from './table/build_request_body';
import { handleErrorResponse } from './handle_error_response';
import { get } from 'lodash';
import { processBucket } from './table/process_bucket';
import { getEsQueryConfig } from './helpers/get_es_query_uisettings';
import { getIndexPatternObject } from './helpers/get_index_pattern';
import { UI_SETTINGS } from '../../../../data/common';

export async function getTableData(req, panel) {
  const panelIndexPattern = panel.index_pattern;

  const {
    searchStrategy,
    capabilities,
  } = await req.framework.searchStrategyRegistry.getViableStrategy(req, panelIndexPattern);
  const esQueryConfig = await getEsQueryConfig(req);
  const { indexPatternObject } = await getIndexPatternObject(req, panelIndexPattern);

  const meta = {
    type: panel.type,
    uiRestrictions: capabilities.uiRestrictions,
  };

  try {
    const uiSettings = req.getUiSettingsService();
    const body = buildRequestBody(req, panel, esQueryConfig, indexPatternObject, capabilities, {
      maxBarsUiSettings: await uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      barTargetUiSettings: await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
    });

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

    return {
      ...meta,
      series: buckets.map(processBucket(panel)),
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
