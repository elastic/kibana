/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IBucketAggConfig } from '../bucket_agg_type';
export declare const createFilterFilters: (
  aggConfig: IBucketAggConfig,
  key: string
) =>
  | {
      query:
        | (Record<string, any> & {
            query_string?: {
              query: string;
              fields?: string[];
            };
          })
        | undefined;
      meta: {
        disabled?: boolean;
        negate?: boolean;
        controlledBy?: string;
        group?: string;
        isMultiIndex?: boolean;
        type?: string;
        key?: string;
        params?: import('@kbn/es-query/src/filters/build_filters').FilterMetaParams;
        value?:
          | string
          | import('@kbn/es-query').RangeFilterParams
          | import('@kbn/es-query/src/filters/build_filters').PhraseFilterValue[];
        index: string;
        alias: string | null | undefined;
      };
    }
  | undefined;
