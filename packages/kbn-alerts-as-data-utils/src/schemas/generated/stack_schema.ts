/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
// ---------------------------------- WARNING ----------------------------------
// this file was generated, and should not be edited by hand
// ---------------------------------- WARNING ----------------------------------
import * as rt from 'io-ts';
import { Either } from 'fp-ts/lib/Either';
import { AlertSchema } from './alert_schema';
const ISO_DATE_PATTERN = /^d{4}-d{2}-d{2}Td{2}:d{2}:d{2}.d{3}Z$/;
export const IsoDateString = new rt.Type<string, string, unknown>(
  'IsoDateString',
  rt.string.is,
  (input, context): Either<rt.Errors, string> => {
    if (typeof input === 'string' && ISO_DATE_PATTERN.test(input)) {
      return rt.success(input);
    } else {
      return rt.failure(input, context);
    }
  },
  rt.identity
);
export type IsoDateStringC = typeof IsoDateString;
export const schemaUnknown = rt.unknown;
export const schemaUnknownArray = rt.array(rt.unknown);
export const schemaString = rt.string;
export const schemaStringArray = rt.array(schemaString);
export const schemaNumber = rt.number;
export const schemaNumberArray = rt.array(schemaNumber);
export const schemaDate = rt.union([IsoDateString, schemaNumber]);
export const schemaDateArray = rt.array(schemaDate);
export const schemaDateRange = rt.partial({
  gte: schemaDate,
  lte: schemaDate,
});
export const schemaDateRangeArray = rt.array(schemaDateRange);
export const schemaStringOrNumber = rt.union([schemaString, schemaNumber]);
export const schemaStringOrNumberArray = rt.array(schemaStringOrNumber);
export const schemaBoolean = rt.boolean;
export const schemaBooleanArray = rt.array(schemaBoolean);
const schemaGeoPointCoords = rt.type({
  type: schemaString,
  coordinates: schemaNumberArray,
});
const schemaGeoPointString = schemaString;
const schemaGeoPointLatLon = rt.type({
  lat: schemaNumber,
  lon: schemaNumber,
});
const schemaGeoPointLocation = rt.type({
  location: schemaNumberArray,
});
const schemaGeoPointLocationString = rt.type({
  location: schemaString,
});
export const schemaGeoPoint = rt.union([
  schemaGeoPointCoords,
  schemaGeoPointString,
  schemaGeoPointLatLon,
  schemaGeoPointLocation,
  schemaGeoPointLocationString,
]);
export const schemaGeoPointArray = rt.array(schemaGeoPoint);
// prettier-ignore
const StackAlertRequired = rt.type({
});
const StackAlertOptional = rt.partial({
  'kibana.alert.evaluation.conditions': schemaString,
  'kibana.alert.evaluation.value': schemaString,
  'kibana.alert.title': schemaString,
});

// prettier-ignore
export const StackAlertSchema = rt.intersection([StackAlertRequired, StackAlertOptional, AlertSchema]);
// prettier-ignore
export type StackAlert = rt.TypeOf<typeof StackAlertSchema>;
