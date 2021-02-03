/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { overwrite } from '../../helpers';
import { esQuery } from '../../../../../../data/server';

export function splitByFilter(req, panel, series, esQueryConfig, indexPattern) {
  return (next) => (doc) => {
    if (series.split_mode !== 'filter') {
      return next(doc);
    }

    overwrite(
      doc,
      `aggs.${series.id}.filter`,
      esQuery.buildEsQuery(indexPattern, [series.filter], [], esQueryConfig)
    );

    return next(doc);
  };
}
