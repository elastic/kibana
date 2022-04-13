/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEsQuery } from '@kbn/es-query';
import { overwrite } from '../../helpers';

export function splitByFilter(req, panel, series, esQueryConfig, seriesIndex) {
  return (next) => (doc) => {
    if (series.split_mode !== 'filter') {
      return next(doc);
    }

    overwrite(
      doc,
      `aggs.${series.id}.filter`,
      buildEsQuery(seriesIndex.indexPattern, [series.filter], [], esQueryConfig)
    );

    return next(doc);
  };
}
