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
const AlertRequired = rt.type({
  '@timestamp': schemaDate,
  kibana: rt.type({
    alert: rt.type({
      instance: rt.type({
        id: schemaString,
      }),
      rule: rt.type({
        category: schemaString,
        consumer: schemaString,
        name: schemaString,
        producer: schemaString,
        revision: schemaStringOrNumber,
        rule_type_id: schemaString,
        uuid: schemaString,
      }),
      status: schemaString,
      uuid: schemaString,
    }),
    space_ids: schemaStringArray,
  }),
});
const AlertOptional = rt.partial({
  event: rt.partial({
    action: schemaString,
    kind: schemaString,
  }),
  kibana: rt.partial({
    alert: rt.partial({
      action_group: schemaString,
      case_ids: schemaStringArray,
      duration: rt.partial({
        us: schemaStringOrNumber,
      }),
      end: schemaDate,
      flapping: schemaBoolean,
      flapping_history: schemaBooleanArray,
      last_detected: schemaDate,
      maintenance_window_ids: schemaStringArray,
      reason: schemaString,
      rule: rt.partial({
        execution: rt.partial({
          uuid: schemaString,
        }),
        parameters: schemaUnknown,
        tags: schemaStringArray,
      }),
      start: schemaDate,
      time_range: schemaDateRange,
      url: schemaString,
      workflow_status: schemaString,
      workflow_tags: schemaStringArray,
    }),
    version: schemaString,
  }),
  tags: schemaStringArray,
});

// prettier-ignore
export const AlertSchema = rt.intersection([AlertRequired, AlertOptional]);
// prettier-ignore
export type Alert = rt.TypeOf<typeof AlertSchema>;
