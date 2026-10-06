/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ExpressionFunctionDefinition,
  ExpressionValueBoxed,
} from '@kbn/expressions-plugin/common';
interface Point {
  lat: number;
  lon: number;
}
export type GeoPoint = Point | string | [number, number];
export type GeoPointOutput = ExpressionValueBoxed<
  'geo_point',
  {
    value: GeoPoint;
  }
>;
interface GeoPointArguments extends Partial<Point> {
  point?: Array<string | number>;
}
export type ExpressionFunctionGeoPoint = ExpressionFunctionDefinition<
  'geoPoint',
  null,
  GeoPointArguments,
  GeoPointOutput
>;
export declare const geoPointFunction: ExpressionFunctionGeoPoint;
export {};
