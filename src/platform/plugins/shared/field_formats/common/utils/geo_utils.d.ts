/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export declare const converter: any;
export declare function withinRange(
  value: string | number,
  min: number,
  max: number
): {
  isInvalid: boolean;
  error: string | null;
};
export declare function ddToUTM(
  lat: number,
  lon: number
): {
  northing: string;
  easting: string;
  zone: string;
};
export declare function utmToDD(northing: string, easting: string, zoneNumber: string): any;
export declare function ddToDMS(lat: number, lon: number): string;
export declare function ddToMGRS(lat: number, lon: number): any;
export declare function mgrstoUSNG(mgrs: string): string;
export declare function mgrsToDD(mgrs: string): any;
