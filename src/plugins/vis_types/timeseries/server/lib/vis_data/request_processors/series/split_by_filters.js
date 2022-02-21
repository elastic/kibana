/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEsQuery } from '@kbn/es-query';
import { overwrite } from '../../helpers';

export function splitByFilters(req, panel, series, esQueryConfig, seriesIndex) {
  return (next) => (doc) => {
    if (series.split_mode === 'filters' && series.split_filters) {
      series.split_filters.forEach((filter) => {
        const builtEsQuery = buildEsQuery(
          seriesIndex.indexPattern,
          [filter.filter],
          [],
          esQueryConfig
        );

        overwrite(doc, `aggs.${series.id}.filters.filters.${filter.id}`, builtEsQuery);
      });
    }
    return next(doc);
  };
}
