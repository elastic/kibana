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
const AlertRequired = rt.type({
  '@timestamp': schemaDate,
  'kibana.alert.instance.id': schemaString,
  'kibana.alert.rule.category': schemaString,
  'kibana.alert.rule.consumer': schemaString,
  'kibana.alert.rule.name': schemaString,
  'kibana.alert.rule.producer': schemaString,
  'kibana.alert.rule.revision': schemaStringOrNumber,
  'kibana.alert.rule.rule_type_id': schemaString,
  'kibana.alert.rule.uuid': schemaString,
  'kibana.alert.status': schemaString,
  'kibana.alert.uuid': schemaString,
  'kibana.space_ids': schemaStringArray,
});
const AlertOptional = rt.partial({
  'event.action': schemaString,
  'event.kind': schemaString,
  'kibana.alert.action_group': schemaString,
  'kibana.alert.case_ids': schemaStringArray,
  'kibana.alert.duration.us': schemaStringOrNumber,
  'kibana.alert.end': schemaDate,
  'kibana.alert.flapping': schemaBoolean,
  'kibana.alert.flapping_history': schemaBooleanArray,
  'kibana.alert.last_detected': schemaDate,
  'kibana.alert.maintenance_window_ids': schemaStringArray,
  'kibana.alert.reason': schemaString,
  'kibana.alert.rule.execution.uuid': schemaString,
  'kibana.alert.rule.parameters': schemaUnknown,
  'kibana.alert.rule.tags': schemaStringArray,
  'kibana.alert.start': schemaDate,
  'kibana.alert.time_range': schemaDateRange,
  'kibana.alert.url': schemaString,
  'kibana.alert.workflow_status': schemaString,
  'kibana.alert.workflow_tags': schemaStringArray,
  'kibana.version': schemaString,
  tags: schemaStringArray,
});

// prettier-ignore
export const AlertSchema = rt.intersection([AlertRequired, AlertOptional]);
// prettier-ignore
export type Alert = rt.TypeOf<typeof AlertSchema>;
