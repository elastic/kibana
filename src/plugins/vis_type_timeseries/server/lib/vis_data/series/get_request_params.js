/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { buildRequestBody } from './build_request_body';
import { getEsShardTimeout } from '../helpers/get_es_shard_timeout';
import { getIndexPatternObject } from '../helpers/get_index_pattern';

export async function getSeriesRequestParams(req, panel, series, esQueryConfig, capabilities) {
  const uiSettings = req.getUiSettingsService();
  const indexPattern =
    (series.override_index_pattern && series.series_index_pattern) || panel.index_pattern;
  const { indexPatternObject, indexPatternString } = await getIndexPatternObject(req, indexPattern);

  const request = await buildRequestBody(
    req,
    panel,
    series,
    esQueryConfig,
    indexPatternObject,
    capabilities,
    uiSettings
  );
  const esShardTimeout = await getEsShardTimeout(req);

  return {
    index: indexPatternString,
    body: {
      ...request,
      timeout: esShardTimeout > 0 ? `${esShardTimeout}ms` : undefined,
    },
  };
}
