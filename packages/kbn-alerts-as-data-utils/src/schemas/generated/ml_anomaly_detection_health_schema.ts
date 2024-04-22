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
const MlAnomalyDetectionHealthAlertRequired = rt.type({
});
// prettier-ignore
const MlAnomalyDetectionHealthAlertOptional = rt.partial({
  'kibana.alert.datafeed_results': rt.array(
    rt.partial({
      datafeed_id: schemaString,
      datafeed_state: schemaString,
      job_id: schemaString,
      job_state: schemaString,
    })
  ),
  'kibana.alert.delayed_data_results': rt.array(
    rt.partial({
      annotation: schemaString,
      end_timestamp: schemaDate,
      job_id: schemaString,
      missed_docs_count: schemaStringOrNumber,
    })
  ),
  'kibana.alert.job_errors_results': rt.array(
    rt.partial({
      errors: schemaUnknown,
      job_id: schemaString,
    })
  ),
  'kibana.alert.mml_results': rt.array(
    rt.partial({
      job_id: schemaString,
      log_time: schemaDate,
      memory_status: schemaString,
      model_bytes: schemaStringOrNumber,
      model_bytes_exceeded: schemaStringOrNumber,
      model_bytes_memory_limit: schemaStringOrNumber,
      peak_model_bytes: schemaStringOrNumber,
    })
  ),
});

// prettier-ignore
export const MlAnomalyDetectionHealthAlertSchema = rt.intersection([MlAnomalyDetectionHealthAlertRequired, MlAnomalyDetectionHealthAlertOptional, AlertSchema]);
// prettier-ignore
export type MlAnomalyDetectionHealthAlert = rt.TypeOf<typeof MlAnomalyDetectionHealthAlertSchema>;
