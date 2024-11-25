/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
const MlAnomalyDetectionAlertRequired = rt.type({
  'kibana.alert.job_id': schemaString,
});
// prettier-ignore
const MlAnomalyDetectionAlertOptional = rt.partial({
  'kibana.alert.anomaly_score': schemaNumberArray,
  'kibana.alert.anomaly_timestamp': schemaDate,
  'kibana.alert.is_interim': schemaBoolean,
  'kibana.alert.top_influencers': rt.array(
    rt.partial({
      influencer_field_name: schemaString,
      influencer_field_value: schemaString,
      influencer_score: schemaNumber,
      initial_influencer_score: schemaNumber,
      is_interim: schemaBoolean,
      job_id: schemaString,
      timestamp: schemaDate,
    })
  ),
  'kibana.alert.top_records': rt.array(
    rt.partial({
      actual: schemaNumber,
      by_field_name: schemaString,
      by_field_value: schemaString,
      detector_index: schemaNumber,
      field_name: schemaString,
      function: schemaString,
      initial_record_score: schemaNumber,
      is_interim: schemaBoolean,
      job_id: schemaString,
      over_field_name: schemaString,
      over_field_value: schemaString,
      partition_field_name: schemaString,
      partition_field_value: schemaString,
      record_score: schemaNumber,
      timestamp: schemaDate,
      typical: schemaNumber,
    })
  ),
});

// prettier-ignore
export const MlAnomalyDetectionAlertSchema = rt.intersection([MlAnomalyDetectionAlertRequired, MlAnomalyDetectionAlertOptional, AlertSchema]);
// prettier-ignore
export type MlAnomalyDetectionAlert = rt.TypeOf<typeof MlAnomalyDetectionAlertSchema>;
