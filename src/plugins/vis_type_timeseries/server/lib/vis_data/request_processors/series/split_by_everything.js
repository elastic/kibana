/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { overwrite } from '../../helpers';

export function splitByEverything(req, panel, series) {
  return (next) => (doc) => {
    if (
      series.split_mode === 'everything' ||
      (series.split_mode === 'terms' && !series.terms_field)
    ) {
      overwrite(doc, `aggs.${series.id}.filter.match_all`, {});
    }
    return next(doc);
  };
}
