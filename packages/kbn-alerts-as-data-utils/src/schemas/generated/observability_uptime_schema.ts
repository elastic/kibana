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
import { LegacyAlertSchema } from './legacy_alert_schema';
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
const ObservabilityUptimeAlertRequired = rt.type({
});
// prettier-ignore
const ObservabilityUptimeAlertOptional = rt.partial({
  'agent.name': schemaString,
  'anomaly.bucket_span.minutes': schemaString,
  'anomaly.start': schemaDate,
  configId: schemaString,
  'error.message': schemaString,
  'host.name': schemaString,
  'kibana.alert.context': schemaUnknown,
  'kibana.alert.evaluation.threshold': schemaStringOrNumber,
  'kibana.alert.evaluation.value': schemaStringOrNumber,
  'kibana.alert.evaluation.values': schemaStringOrNumberArray,
  'kibana.alert.group': rt.array(
    rt.partial({
      field: schemaStringArray,
      value: schemaStringArray,
    })
  ),
  'location.id': schemaString,
  'location.name': schemaString,
  'monitor.id': schemaString,
  'monitor.name': schemaString,
  'monitor.tags': schemaStringArray,
  'monitor.type': schemaString,
  'observer.geo.name': schemaString,
  'tls.server.hash.sha256': schemaString,
  'tls.server.x509.issuer.common_name': schemaString,
  'tls.server.x509.not_after': schemaDate,
  'tls.server.x509.not_before': schemaDate,
  'tls.server.x509.subject.common_name': schemaString,
  'url.full': schemaString,
});

// prettier-ignore
export const ObservabilityUptimeAlertSchema = rt.intersection([ObservabilityUptimeAlertRequired, ObservabilityUptimeAlertOptional, AlertSchema, LegacyAlertSchema]);
// prettier-ignore
export type ObservabilityUptimeAlert = rt.TypeOf<typeof ObservabilityUptimeAlertSchema>;
