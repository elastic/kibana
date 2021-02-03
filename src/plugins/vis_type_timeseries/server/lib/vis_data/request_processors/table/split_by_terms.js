/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { overwrite } from '../../helpers';
import { esQuery } from '../../../../../../data/server';

export function splitByTerms(req, panel, esQueryConfig, indexPattern) {
  return (next) => (doc) => {
    panel.series
      .filter((c) => c.aggregate_by && c.aggregate_function)
      .forEach((column) => {
        overwrite(doc, `aggs.pivot.aggs.${column.id}.terms.field`, column.aggregate_by);
        overwrite(doc, `aggs.pivot.aggs.${column.id}.terms.size`, 100);

        if (column.filter) {
          overwrite(
            doc,
            `aggs.pivot.aggs.${column.id}.column_filter.filter`,
            esQuery.buildEsQuery(indexPattern, [column.filter], [], esQueryConfig)
          );
        }
      });
    return next(doc);
  };
}
