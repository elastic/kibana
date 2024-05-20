/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { camelCase, chain, isNil, omit } from 'lodash';
import { buildExpression, buildExpressionFunction } from '@kbn/expressions-plugin/common';
import { ExpressionFunctionGeoBoundingBox, GeoBoundingBox } from './geo_bounding_box';
import { geoPointToAst } from './geo_point_to_ast';

const GEO_POINTS = ['top_left', 'bottom_right', 'top_right', 'bottom_left'];

export const geoBoundingBoxToAst = (geoBoundingBox: GeoBoundingBox) => {
  return buildExpression([
    buildExpressionFunction<ExpressionFunctionGeoBoundingBox>('geoBoundingBox', {
      ...omit(geoBoundingBox, GEO_POINTS),
      ...chain(geoBoundingBox)
        .pick(GEO_POINTS)
        .omitBy(isNil)
        .mapKeys((value, key) => camelCase(key))
        .mapValues((value) => geoPointToAst(value))
        .value(),
    }),
  ]).toAst();
};
