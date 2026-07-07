/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { overwrite } from '../../helpers';
import { validateField } from '../../../../../common/fields_utils';

import type { AnnotationsRequestProcessorsFunction } from './types';

export const topHits: AnnotationsRequestProcessorsFunction = ({
  panel,
  annotation,
  annotationIndex,
}) => {
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
      fields: [...fields, timeField],
      size: 5,
    });
    return next(doc);
  };
};
