/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { overwrite } from '../../helpers';
import { basicAggs } from '../../../../../common/basic_aggs';
import { getBucketsPath } from '../../helpers/get_buckets_path';
import { bucketTransform } from '../../helpers/bucket_transform';
import { getFieldsForTerms, validateField } from '../../../../../common/fields_utils';

export function splitByTerms(req, panel, series, esQueryConfig, seriesIndex) {
  return (next) => (doc) => {
    const termsIds = getFieldsForTerms(series.terms_field);

    if (series.split_mode === 'terms' && termsIds.length) {
      const termsType = termsIds.length > 1 ? 'multi_terms' : 'terms';
      const orderByTerms = series.terms_order_by;

      termsIds.forEach((termsField) => {
        validateField(termsField, seriesIndex);
      });

      const direction = series.terms_direction || 'desc';
      const metric = series.metrics.find((item) => item.id === orderByTerms);

      if (termsType === 'multi_terms') {
        overwrite(
          doc,
          `aggs.${series.id}.${termsType}.terms`,
          termsIds.map((item) => ({
            field: item,
          }))
        );
      } else {
        overwrite(doc, `aggs.${series.id}.${termsType}.field`, termsIds[0]);
      }

      overwrite(doc, `aggs.${series.id}.${termsType}.size`, series.terms_size);
      if (series.terms_include) {
        overwrite(doc, `aggs.${series.id}.${termsType}.include`, series.terms_include);
      }
      if (series.terms_exclude) {
        overwrite(doc, `aggs.${series.id}.${termsType}.exclude`, series.terms_exclude);
      }
      if (metric && metric.type !== 'count' && ~basicAggs.indexOf(metric.type)) {
        const sortAggKey = `${orderByTerms}-SORT`;
        const fn = bucketTransform[metric.type];
        const bucketPath = getBucketsPath(orderByTerms, series.metrics).replace(
          orderByTerms,
          sortAggKey
        );
        overwrite(doc, `aggs.${series.id}.${termsType}.order`, { [bucketPath]: direction });
        overwrite(doc, `aggs.${series.id}.aggs`, { [sortAggKey]: fn(metric) });
      } else if (['_key', '_count'].includes(orderByTerms)) {
        overwrite(doc, `aggs.${series.id}.${termsType}.order`, { [orderByTerms]: direction });
      } else {
        overwrite(doc, `aggs.${series.id}.${termsType}.order`, { _count: direction });
      }
    }
    return next(doc);
  };
}
