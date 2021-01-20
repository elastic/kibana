/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import {
  FilterValueFormatter,
  GeoBoundingBoxFilter,
  FILTERS,
  isGeoBoundingBoxFilter,
  Filter,
} from '../../../../../common';

const getFormattedValueFn = (params: any) => {
  return (formatter?: FilterValueFormatter) => {
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

const getParams = (filter: GeoBoundingBoxFilter) => {
  const key = Object.keys(filter.geo_bounding_box).filter((k) => k !== 'ignore_unmapped')[0];
  const params = filter.geo_bounding_box[key];

  return {
    key,
    params,
    type: FILTERS.GEO_BOUNDING_BOX,
    value: getFormattedValueFn(params),
  };
};

export const mapGeoBoundingBox = (filter: Filter) => {
  if (!isGeoBoundingBoxFilter(filter)) {
    throw filter;
  }

  return getParams(filter);
};
