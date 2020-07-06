/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { i18n } from '@kbn/i18n';
import { BucketAggType } from './bucket_agg_type';
import { BUCKET_TYPES } from './bucket_agg_types';
import { GetInternalStartServicesFn } from '../../../types';
import { GeoBoundingBox } from './lib/geo_point';
import { BaseAggParams } from '../types';

const filterTitle = i18n.translate('data.search.aggs.buckets.filterTitle', {
  defaultMessage: 'Filter',
});

export interface FilterBucketAggDependencies {
  getInternalStartServices: GetInternalStartServicesFn;
}

export interface AggParamsFilter extends BaseAggParams {
  geo_bounding_box?: GeoBoundingBox;
}

export const getFilterBucketAgg = ({ getInternalStartServices }: FilterBucketAggDependencies) =>
  new BucketAggType(
    {
      name: BUCKET_TYPES.FILTER,
      title: filterTitle,
      makeLabel: () => filterTitle,
      params: [
        {
          name: 'geo_bounding_box',
        },
      ],
    },
    { getInternalStartServices }
  );
