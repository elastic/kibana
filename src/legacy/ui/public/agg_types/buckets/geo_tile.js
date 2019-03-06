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

import _ from 'lodash';
import { BucketAggType } from './_bucket_agg_type';
import { i18n } from '@kbn/i18n';

export const geoTileBucketAgg = new BucketAggType({
  name: 'geotile_grid',
  title: i18n.translate('common.ui.aggTypes.buckets.geotileGridTitle', {
    defaultMessage: 'Geotile',
  }),
  params: [
    {
      name: 'field',
      type: 'field',
      filterFieldTypes: 'geo_point'
    },
    {
      name: 'useGeocentroid',
      default: true,
      write: _.noop
    },
    {
      name: 'precision',
      default: 0,
    }
  ],
  getRequestAggs: function (agg) {
    const aggs = [];
    const params = agg.params;

    aggs.push(agg);

    if (params.useGeocentroid) {
      aggs.push(agg.aggConfigs.createAggConfig({
        type: 'geo_centroid',
        enabled: true,
        params: {
          field: agg.getField()
        }
      }, { addToAggConfigs: false }));
    }

    return aggs;
  }
});
