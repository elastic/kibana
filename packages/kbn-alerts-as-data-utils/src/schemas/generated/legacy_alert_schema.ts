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
export const schemaDate = IsoDateString;
export const schemaDateArray = rt.array(IsoDateString);
export const schemaDateRange = rt.partial({
  gte: schemaDate,
  lte: schemaDate,
});
export const schemaDateRangeArray = rt.array(schemaDateRange);
export const schemaUnknown = rt.unknown;
export const schemaUnknownArray = rt.array(rt.unknown);
export const schemaString = rt.string;
export const schemaStringArray = rt.array(schemaString);
export const schemaNumber = rt.number;
export const schemaNumberArray = rt.array(schemaNumber);
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
const LegacyAlertOptional = rt.partial({
  ecs: rt.partial({
    version: schemaString,
  }),
  kibana: rt.partial({
    alert: rt.partial({
      risk_score: schemaNumber,
      rule: rt.partial({
        author: schemaString,
        created_at: schemaDate,
        created_by: schemaString,
        description: schemaString,
        enabled: schemaString,
        from: schemaString,
        interval: schemaString,
        license: schemaString,
        note: schemaString,
        references: schemaStringArray,
        rule_id: schemaString,
        rule_name_override: schemaString,
        to: schemaString,
        type: schemaString,
        updated_at: schemaDate,
        updated_by: schemaString,
        version: schemaString,
      }),
      severity: schemaString,
      suppression: rt.partial({
        docs_count: schemaStringOrNumber,
        end: schemaDate,
        start: schemaDate,
        terms: rt.partial({
          field: schemaStringArray,
          value: schemaStringArray,
        }),
      }),
      system_status: schemaString,
      workflow_reason: schemaString,
      workflow_user: schemaString,
    }),
  }),
});

// prettier-ignore
export const LegacyAlertSchema = rt.intersection([LegacyAlertRequired, LegacyAlertOptional]);
// prettier-ignore
export type LegacyAlert = rt.TypeOf<typeof LegacyAlertSchema>;
