import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
interface Point {
    lat: number;
    lon: number;
}
export type GeoPoint = Point | string | [number, number];
export type GeoPointOutput = ExpressionValueBoxed<'geo_point', {
    value: GeoPoint;
}>;
interface GeoPointArguments extends Partial<Point> {
    point?: Array<string | number>;
}
export type ExpressionFunctionGeoPoint = ExpressionFunctionDefinition<'geoPoint', null, GeoPointArguments, GeoPointOutput>;
export declare const geoPointFunction: ExpressionFunctionGeoPoint;
export {};
