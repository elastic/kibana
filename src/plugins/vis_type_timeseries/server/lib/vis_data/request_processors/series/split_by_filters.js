/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { overwrite } from '../../helpers';
import { esQuery } from '../../../../../../data/server';

export function splitByFilters(req, panel, series, esQueryConfig, indexPattern) {
  return (next) => (doc) => {
    if (series.split_mode === 'filters' && series.split_filters) {
      series.split_filters.forEach((filter) => {
        const builtEsQuery = esQuery.buildEsQuery(indexPattern, [filter.filter], [], esQueryConfig);

        overwrite(doc, `aggs.${series.id}.filters.filters.${filter.id}`, builtEsQuery);
      });
    }
    return next(doc);
  };
}
