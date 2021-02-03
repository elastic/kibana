/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { getBucketSize } from '../../helpers/get_bucket_size';
import { getTimerange } from '../../helpers/get_timerange';
import { esQuery, UI_SETTINGS } from '../../../../../../data/server';

export function query(
  req,
  panel,
  annotation,
  esQueryConfig,
  indexPattern,
  capabilities,
  uiSettings
) {
  return (next) => async (doc) => {
    const barTargetUiSettings = await uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET);
    const timeField = annotation.time_field;
    const { bucketSize } = getBucketSize(req, 'auto', capabilities, barTargetUiSettings);
    const { from, to } = getTimerange(req);

    doc.size = 0;
    const queries = !annotation.ignore_global_filters ? req.payload.query : [];
    const filters = !annotation.ignore_global_filters ? req.payload.filters : [];
    doc.query = esQuery.buildEsQuery(indexPattern, queries, filters, esQueryConfig);
    const timerange = {
      range: {
        [timeField]: {
          gte: from.toISOString(),
          lte: to.subtract(bucketSize, 'seconds').toISOString(),
          format: 'strict_date_optional_time',
        },
      },
    };
    doc.query.bool.must.push(timerange);

    if (annotation.query_string) {
      doc.query.bool.must.push(
        esQuery.buildEsQuery(indexPattern, [annotation.query_string], [], esQueryConfig)
      );
    }

    if (!annotation.ignore_panel_filters && panel.filter) {
      doc.query.bool.must.push(
        esQuery.buildEsQuery(indexPattern, [panel.filter], [], esQueryConfig)
      );
    }

    if (annotation.fields) {
      const fields = annotation.fields.split(/[,\s]+/) || [];
      fields.forEach((field) => {
        doc.query.bool.must.push({ exists: { field } });
      });
    }

    return next(doc);
  };
}
