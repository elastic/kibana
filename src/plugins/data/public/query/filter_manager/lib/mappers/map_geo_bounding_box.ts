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
import { esFilters } from '../../../../../common';

const getFormattedValueFn = (params: any) => {
  return (formatter?: esFilters.FilterValueFormatter) => {
    const corners = formatter
      ? {
          topLeft: formatter.convert(params.top_left),
          bottomRight: formatter.convert(params.bottom_right),
        }
      : {
          topLeft: JSON.stringify(params.top_left),
          bottomRight: JSON.stringify(params.bottom_right),
        };

    return corners.topLeft + ' to ' + corners.bottomRight;
  };
};

const getParams = (filter: esFilters.GeoBoundingBoxFilter) => {
  const key = Object.keys(filter.geo_bounding_box).filter(k => k !== 'ignore_unmapped')[0];
  const params = filter.geo_bounding_box[key];

  return {
    key,
    params,
    type: esFilters.FILTERS.GEO_BOUNDING_BOX,
    value: getFormattedValueFn(params),
  };
};

export const mapGeoBoundingBox = (filter: esFilters.Filter) => {
  if (!esFilters.isGeoBoundingBoxFilter(filter)) {
    throw filter;
  }

  return getParams(filter);
};
