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
import { EcsSchema } from './ecs_schema';
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
const SecurityAlertRequired = rt.type({
  '@timestamp': schemaDate,
  kibana: rt.type({
    alert: rt.type({
      ancestors: rt.array(
        rt.type({
          depth: schemaStringOrNumber,
          id: schemaString,
          index: schemaString,
          type: schemaString,
        })
      ),
      depth: schemaStringOrNumber,
      instance: rt.type({
        id: schemaString,
      }),
      original_event: rt.type({
        action: schemaString,
        category: schemaStringArray,
        created: schemaDate,
        dataset: schemaString,
        id: schemaString,
        ingested: schemaDate,
        kind: schemaString,
        module: schemaString,
        original: schemaString,
        outcome: schemaString,
        provider: schemaString,
        sequence: schemaStringOrNumber,
        type: schemaStringArray,
      }),
      original_time: schemaDate,
      rule: rt.type({
        category: schemaString,
        consumer: schemaString,
        false_positives: schemaStringArray,
        max_signals: schemaStringOrNumberArray,
        name: schemaString,
        producer: schemaString,
        revision: schemaStringOrNumber,
        rule_type_id: schemaString,
        threat: rt.type({
          framework: schemaString,
          tactic: rt.type({
            id: schemaString,
            name: schemaString,
            reference: schemaString,
          }),
          technique: rt.type({
            id: schemaString,
            name: schemaString,
            reference: schemaString,
            subtechnique: rt.type({
              id: schemaString,
              name: schemaString,
              reference: schemaString,
            }),
          }),
        }),
        uuid: schemaString,
      }),
      status: schemaString,
      uuid: schemaString,
    }),
    space_ids: schemaStringArray,
  }),
});
const SecurityAlertOptional = rt.partial({
  ecs: rt.partial({
    version: schemaString,
  }),
  event: rt.partial({
    action: schemaString,
    kind: schemaString,
  }),
  kibana: rt.partial({
    alert: rt.partial({
      action_group: schemaString,
      ancestors: rt.partial({
        rule: schemaString,
      }),
      building_block_type: schemaString,
      case_ids: schemaStringArray,
      duration: rt.partial({
        us: schemaStringOrNumber,
      }),
      end: schemaDate,
      flapping: schemaBoolean,
      flapping_history: schemaBooleanArray,
      group: rt.partial({
        id: schemaString,
        index: schemaNumber,
      }),
      last_detected: schemaDate,
      maintenance_window_ids: schemaStringArray,
      new_terms: schemaStringArray,
      original_event: rt.partial({
        agent_id_status: schemaString,
        code: schemaString,
        duration: schemaString,
        end: schemaDate,
        hash: schemaString,
        reason: schemaString,
        reference: schemaString,
        risk_score: schemaNumber,
        risk_score_norm: schemaNumber,
        severity: schemaStringOrNumber,
        start: schemaDate,
        timezone: schemaString,
        url: schemaString,
      }),
      reason: schemaString,
      risk_score: schemaNumber,
      rule: rt.partial({
        author: schemaString,
        building_block_type: schemaString,
        created_at: schemaDate,
        created_by: schemaString,
        description: schemaString,
        enabled: schemaString,
        execution: rt.partial({
          uuid: schemaString,
        }),
        from: schemaString,
        immutable: schemaStringArray,
        interval: schemaString,
        license: schemaString,
        note: schemaString,
        parameters: schemaUnknown,
        references: schemaStringArray,
        rule_id: schemaString,
        rule_name_override: schemaString,
        tags: schemaStringArray,
        timeline_id: schemaStringArray,
        timeline_title: schemaStringArray,
        timestamp_override: schemaString,
        to: schemaString,
        type: schemaString,
        updated_at: schemaDate,
        updated_by: schemaString,
        version: schemaString,
      }),
      severity: schemaString,
      start: schemaDate,
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
      threshold_result: rt.partial({
        count: schemaStringOrNumber,
        from: schemaDate,
        terms: rt.array(
          rt.partial({
            field: schemaString,
            value: schemaString,
          })
        ),
      }),
      time_range: schemaDateRange,
      url: schemaString,
      workflow_reason: schemaString,
      workflow_status: schemaString,
      workflow_tags: schemaStringArray,
      workflow_user: schemaString,
    }),
    version: schemaString,
  }),
  signal: rt.partial({
    ancestors: rt.partial({
      depth: schemaUnknown,
      id: schemaUnknown,
      index: schemaUnknown,
      type: schemaUnknown,
    }),
    depth: schemaUnknown,
    group: rt.partial({
      id: schemaUnknown,
      index: schemaUnknown,
    }),
    original_event: rt.partial({
      action: schemaUnknown,
      category: schemaUnknown,
      code: schemaUnknown,
      created: schemaUnknown,
      dataset: schemaUnknown,
      duration: schemaUnknown,
      end: schemaUnknown,
      hash: schemaUnknown,
      id: schemaUnknown,
      kind: schemaUnknown,
      module: schemaUnknown,
      outcome: schemaUnknown,
      provider: schemaUnknown,
      reason: schemaUnknown,
      risk_score: schemaUnknown,
      risk_score_norm: schemaUnknown,
      sequence: schemaUnknown,
      severity: schemaUnknown,
      start: schemaUnknown,
      timezone: schemaUnknown,
      type: schemaUnknown,
    }),
    original_time: schemaUnknown,
    reason: schemaUnknown,
    rule: rt.partial({
      author: schemaUnknown,
      building_block_type: schemaUnknown,
      created_at: schemaUnknown,
      created_by: schemaUnknown,
      description: schemaUnknown,
      enabled: schemaUnknown,
      false_positives: schemaUnknown,
      from: schemaUnknown,
      id: schemaUnknown,
      immutable: schemaUnknown,
      interval: schemaUnknown,
      license: schemaUnknown,
      max_signals: schemaUnknown,
      name: schemaUnknown,
      note: schemaUnknown,
      references: schemaUnknown,
      risk_score: schemaUnknown,
      rule_id: schemaUnknown,
      rule_name_override: schemaUnknown,
      severity: schemaUnknown,
      tags: schemaUnknown,
      threat: rt.partial({
        framework: schemaUnknown,
        tactic: rt.partial({
          id: schemaUnknown,
          name: schemaUnknown,
          reference: schemaUnknown,
        }),
        technique: rt.partial({
          id: schemaUnknown,
          name: schemaUnknown,
          reference: schemaUnknown,
          subtechnique: rt.partial({
            id: schemaUnknown,
            name: schemaUnknown,
            reference: schemaUnknown,
          }),
        }),
      }),
      timeline_id: schemaUnknown,
      timeline_title: schemaUnknown,
      timestamp_override: schemaUnknown,
      to: schemaUnknown,
      type: schemaUnknown,
      updated_at: schemaUnknown,
      updated_by: schemaUnknown,
      version: schemaUnknown,
    }),
    status: schemaUnknown,
    threshold_result: rt.partial({
      cardinality: rt.partial({
        field: schemaUnknown,
        value: schemaUnknown,
      }),
      count: schemaUnknown,
      from: schemaUnknown,
      terms: rt.partial({
        field: schemaUnknown,
        value: schemaUnknown,
      }),
    }),
  }),
  tags: schemaStringArray,
});

// prettier-ignore
export const SecurityAlertSchema = rt.intersection([SecurityAlertRequired, SecurityAlertOptional, AlertSchema, EcsSchema, LegacyAlertSchema]);
// prettier-ignore
export type SecurityAlert = rt.TypeOf<typeof SecurityAlertSchema>;
