import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
import type { GeoPoint, GeoPointOutput } from './geo_point';
type GeoBox = {
    top: number;
    left: number;
    bottom: number;
    right: number;
};
type GeoPoints = {
    top_left: GeoPoint;
    bottom_right: GeoPoint;
} | {
    top_right: GeoPoint;
    bottom_left: GeoPoint;
};
type WellKnownText = {
    wkt: string;
};
/** GeoBoundingBox Accepted Formats:
 *  Lat Lon As Properties:
 *  "top_left" : {
 *    "lat" : 40.73, "lon" : -74.1
 *  },
 *  "bottom_right" : {
 *    "lat" : 40.01,  "lon" : -71.12
 *  }
 *
 *  Lat Lon As Array:
 *  {
 *    "top_left" : [-74.1, 40.73],
 *    "bottom_right" : [-71.12, 40.01]
 *  }
 *
 *  Lat Lon As String:
 *  {
 *    "top_left" : "40.73, -74.1",
 *    "bottom_right" : "40.01, -71.12"
 *  }
 *
 *  Bounding Box as Well-Known Text (WKT):
 *  {
 *    "wkt" : "BBOX (-74.1, -71.12, 40.73, 40.01)"
 *  }
 *
 *  Geohash:
 *  {
 *    "top_right" : "dr5r9ydj2y73",
 *    "bottom_left" : "drj7teegpus6"
 *  }
 *
 *  Vertices:
 *  {
 *    "top" : 40.73,
 *    "left" : -74.1,
 *    "bottom" : 40.01,
 *    "right" : -71.12
 *  }
 *
 * **/
export type GeoBoundingBox = GeoBox | GeoPoints | WellKnownText;
export type GeoBoundingBoxOutput = ExpressionValueBoxed<'geo_bounding_box', GeoBoundingBox>;
type GeoPointsArguments = {
    topLeft: GeoPointOutput;
    bottomRight: GeoPointOutput;
} | {
    topRight: GeoPointOutput;
    bottomLeft: GeoPointOutput;
};
type GeoBoundingBoxArguments = GeoBox | GeoPointsArguments | WellKnownText;
export type ExpressionFunctionGeoBoundingBox = ExpressionFunctionDefinition<'geoBoundingBox', null, GeoBoundingBoxArguments, GeoBoundingBoxOutput>;
export declare const geoBoundingBoxFunction: ExpressionFunctionGeoBoundingBox;
export {};
