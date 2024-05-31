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
const LegacyAlertRequired = rt.type({
});
// prettier-ignore
const LegacyAlertOptional = rt.partial({
  'ecs.version': schemaString,
  'kibana.alert.risk_score': schemaNumber,
  'kibana.alert.rule.author': schemaString,
  'kibana.alert.rule.created_at': schemaDate,
  'kibana.alert.rule.created_by': schemaString,
  'kibana.alert.rule.description': schemaString,
  'kibana.alert.rule.enabled': schemaString,
  'kibana.alert.rule.from': schemaString,
  'kibana.alert.rule.interval': schemaString,
  'kibana.alert.rule.license': schemaString,
  'kibana.alert.rule.note': schemaString,
  'kibana.alert.rule.references': schemaStringArray,
  'kibana.alert.rule.rule_id': schemaString,
  'kibana.alert.rule.rule_name_override': schemaString,
  'kibana.alert.rule.to': schemaString,
  'kibana.alert.rule.type': schemaString,
  'kibana.alert.rule.updated_at': schemaDate,
  'kibana.alert.rule.updated_by': schemaString,
  'kibana.alert.rule.version': schemaString,
  'kibana.alert.severity': schemaString,
  'kibana.alert.suppression.docs_count': schemaStringOrNumber,
  'kibana.alert.suppression.end': schemaDate,
  'kibana.alert.suppression.start': schemaDate,
  'kibana.alert.suppression.terms.field': schemaStringArray,
  'kibana.alert.suppression.terms.value': schemaStringArray,
  'kibana.alert.system_status': schemaString,
  'kibana.alert.workflow_reason': schemaString,
  'kibana.alert.workflow_status_updated_at': schemaDate,
  'kibana.alert.workflow_user': schemaString,
});

// prettier-ignore
export const LegacyAlertSchema = rt.intersection([LegacyAlertRequired, LegacyAlertOptional]);
// prettier-ignore
export type LegacyAlert = rt.TypeOf<typeof LegacyAlertSchema>;
