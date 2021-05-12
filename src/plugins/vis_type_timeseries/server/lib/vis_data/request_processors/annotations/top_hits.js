/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { overwrite } from '../../helpers';
import { validateField } from '../../../../../common/fields_utils';

export function topHits(req, panel, annotation, esQueryConfig, annotationIndex) {
  return (next) => (doc) => {
    const fields = (annotation.fields && annotation.fields.split(/[,\s]+/)) || [];
    const timeField = annotation.time_field || annotationIndex.indexPattern?.timeFieldName || '';

    if (panel.use_kibana_indexes) {
      validateField(timeField, annotationIndex);
    }

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
