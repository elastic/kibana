/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { createFilterTerms } from './create_filter/terms';
import { aggRareTermsFnName } from './rare_terms_fn';
import { BaseAggParams } from '../types';

import { KBN_FIELD_TYPES } from '../../..';

const termsTitle = i18n.translate('data.search.aggs.buckets.rareTermsTitle', {
  defaultMessage: 'Rare terms',
});

export interface AggParamsRareTerms extends BaseAggParams {
  field: string;
  max_doc_count?: number;
}

export const getRareTermsBucketAgg = () => {
  return new BucketAggType({
    name: BUCKET_TYPES.RARE_TERMS,
    expressionName: aggRareTermsFnName,
    title: termsTitle,
    makeLabel(agg) {
      return i18n.translate('data.search.aggs.rareTerms.aggTypesLabel', {
        defaultMessage: 'Rare terms of {fieldName}',
        values: {
          fieldName: agg.getFieldDisplayName(),
        },
      });
    },
    createFilter: createFilterTerms,
    params: [
      {
        name: 'field',
        type: 'field',
        filterFieldTypes: [
          KBN_FIELD_TYPES.NUMBER,
          KBN_FIELD_TYPES.BOOLEAN,
          KBN_FIELD_TYPES.DATE,
          KBN_FIELD_TYPES.IP,
          KBN_FIELD_TYPES.STRING,
        ],
      },
      {
        name: 'max_doc_count',
        default: 1,
      },
    ],
  });
};
