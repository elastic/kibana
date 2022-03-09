/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { buildEsQuery } from '@kbn/es-query';
import { getBucketSize, getTimerange, overwrite } from '../../helpers';
import { validateField } from '../../../../../common/fields_utils';
import { UI_SETTINGS } from '../../../../../../../data/server';

import type { AnnotationsRequestProcessorsFunction } from './types';

export const query: AnnotationsRequestProcessorsFunction = ({
  req,
  panel,
  annotation,
  esQueryConfig,
  annotationIndex,
  capabilities,
  uiSettings,
}) => {
  return (next) => async (doc) => {
    const barTargetUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);
    const timeField = (annotation.time_field || annotationIndex.indexPattern?.timeFieldName) ?? '';
    const indexPattern = annotationIndex.indexPattern || undefined;

    if (panel.use_kibana_indexes) {
      validateField(timeField, annotationIndex);
    }

    const { bucketSize } = getBucketSize(req, 'auto', capabilities, barTargetUiSettings);
    const { from, to } = getTimerange(req);

    const queries = !annotation.ignore_global_filters ? req.body.query : [];
    const filters = !annotation.ignore_global_filters ? req.body.filters : [];
    const esQuery = buildEsQuery(indexPattern, queries, filters, esQueryConfig);

    if (timeField) {
      esQuery.bool.must.push({
        range: {
          [timeField]: {
            gte: from.toISOString(),
            lte: to.subtract(bucketSize, 'seconds').toISOString(),
            format: 'strict_date_optional_time',
          },
        },
      });
    }

    if (annotation.query_string) {
      esQuery.bool.must.push(
        buildEsQuery(indexPattern, [annotation.query_string], [], esQueryConfig)
      );
    }

    if (!annotation.ignore_panel_filters && panel.filter) {
      esQuery.bool.must.push(buildEsQuery(indexPattern, [panel.filter], [], esQueryConfig));
    }

    if (annotation.fields) {
      const fields = annotation.fields.split(/[,\s]+/) || [];
      fields.forEach((field) => {
        esQuery.bool.must.push({ exists: { field } });
      });
    }

    overwrite(doc, 'size', 0);
    overwrite(doc, 'query', esQuery);

    return next(doc);
  };
};
