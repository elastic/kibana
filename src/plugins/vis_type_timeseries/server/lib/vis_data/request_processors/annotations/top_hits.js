/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { overwrite } from '../../helpers';

export function topHits(req, panel, annotation) {
  return (next) => (doc) => {
    const fields = (annotation.fields && annotation.fields.split(/[,\s]+/)) || [];
    const timeField = annotation.time_field;

    overwrite(doc, `aggs.${annotation.id}.aggs.hits.top_hits`, {
      sort: [
        {
          [timeField]: { order: 'desc' },
        },
      ],
      _source: {
        includes: [...fields, timeField],
      },
      size: 5,
    });
    return next(doc);
  };
}
