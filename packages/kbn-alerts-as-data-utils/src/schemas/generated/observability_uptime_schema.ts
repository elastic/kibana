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
const ObservabilityUptimeAlertRequiredFlattened = rt.type({
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
const ObservabilityUptimeAlertOptionalFlattened = rt.partial({
  'agent.name': schemaString,
  'anomaly.bucket_span.minutes': schemaString,
  'anomaly.start': schemaDate,
  'ecs.version': schemaString,
  'error.message': schemaString,
  'event.action': schemaString,
  'event.kind': schemaString,
  'kibana.alert.action_group': schemaString,
  'kibana.alert.case_ids': schemaStringArray,
  'kibana.alert.duration.us': schemaStringOrNumber,
  'kibana.alert.end': schemaDate,
  'kibana.alert.evaluation.threshold': schemaStringOrNumber,
  'kibana.alert.evaluation.value': schemaStringOrNumber,
  'kibana.alert.evaluation.values': schemaStringOrNumberArray,
  'kibana.alert.flapping': schemaBoolean,
  'kibana.alert.flapping_history': schemaBooleanArray,
  'kibana.alert.last_detected': schemaDate,
  'kibana.alert.maintenance_window_ids': schemaStringArray,
  'kibana.alert.reason': schemaString,
  'kibana.alert.risk_score': schemaNumber,
  'kibana.alert.rule.author': schemaString,
  'kibana.alert.rule.created_at': schemaDate,
  'kibana.alert.rule.created_by': schemaString,
  'kibana.alert.rule.description': schemaString,
  'kibana.alert.rule.enabled': schemaString,
  'kibana.alert.rule.execution.uuid': schemaString,
  'kibana.alert.rule.from': schemaString,
  'kibana.alert.rule.interval': schemaString,
  'kibana.alert.rule.license': schemaString,
  'kibana.alert.rule.note': schemaString,
  'kibana.alert.rule.parameters': schemaUnknown,
  'kibana.alert.rule.references': schemaStringArray,
  'kibana.alert.rule.rule_id': schemaString,
  'kibana.alert.rule.rule_name_override': schemaString,
  'kibana.alert.rule.tags': schemaStringArray,
  'kibana.alert.rule.to': schemaString,
  'kibana.alert.rule.type': schemaString,
  'kibana.alert.rule.updated_at': schemaDate,
  'kibana.alert.rule.updated_by': schemaString,
  'kibana.alert.rule.version': schemaString,
  'kibana.alert.severity': schemaString,
  'kibana.alert.start': schemaDate,
  'kibana.alert.suppression.docs_count': schemaStringOrNumber,
  'kibana.alert.suppression.end': schemaDate,
  'kibana.alert.suppression.start': schemaDate,
  'kibana.alert.suppression.terms.field': schemaStringArray,
  'kibana.alert.suppression.terms.value': schemaStringArray,
  'kibana.alert.system_status': schemaString,
  'kibana.alert.time_range': schemaDateRange,
  'kibana.alert.url': schemaString,
  'kibana.alert.workflow_reason': schemaString,
  'kibana.alert.workflow_status': schemaString,
  'kibana.alert.workflow_user': schemaString,
  'kibana.version': schemaString,
  'monitor.id': schemaString,
  'monitor.name': schemaString,
  'monitor.type': schemaString,
  'observer.geo.name': schemaString,
  tags: schemaStringArray,
  'tls.server.hash.sha256': schemaString,
  'tls.server.x509.issuer.common_name': schemaString,
  'tls.server.x509.not_after': schemaDate,
  'tls.server.x509.not_before': schemaDate,
  'tls.server.x509.subject.common_name': schemaString,
  'url.full': schemaString,
});
const ObservabilityUptimeAlertRequired = rt.type({
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
const ObservabilityUptimeAlertOptional = rt.partial({
  agent: rt.partial({
    name: schemaString,
  }),
  anomaly: rt.partial({
    bucket_span: rt.partial({
      minutes: schemaString,
    }),
    start: schemaDate,
  }),
  ecs: rt.partial({
    version: schemaString,
  }),
  error: rt.partial({
    message: schemaString,
  }),
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
      evaluation: rt.partial({
        threshold: schemaStringOrNumber,
        value: schemaStringOrNumber,
        values: schemaStringOrNumberArray,
      }),
      flapping: schemaBoolean,
      flapping_history: schemaBooleanArray,
      last_detected: schemaDate,
      maintenance_window_ids: schemaStringArray,
      reason: schemaString,
      risk_score: schemaNumber,
      rule: rt.partial({
        author: schemaString,
        created_at: schemaDate,
        created_by: schemaString,
        description: schemaString,
        enabled: schemaString,
        execution: rt.partial({
          uuid: schemaString,
        }),
        from: schemaString,
        interval: schemaString,
        license: schemaString,
        note: schemaString,
        parameters: schemaUnknown,
        references: schemaStringArray,
        rule_id: schemaString,
        rule_name_override: schemaString,
        tags: schemaStringArray,
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
      time_range: schemaDateRange,
      url: schemaString,
      workflow_reason: schemaString,
      workflow_status: schemaString,
      workflow_user: schemaString,
    }),
    version: schemaString,
  }),
  monitor: rt.partial({
    id: schemaString,
    name: schemaString,
    type: schemaString,
  }),
  observer: rt.partial({
    geo: rt.partial({
      name: schemaString,
    }),
  }),
  tags: schemaStringArray,
  tls: rt.partial({
    server: rt.partial({
      hash: rt.partial({
        sha256: schemaString,
      }),
      x509: rt.partial({
        issuer: rt.partial({
          common_name: schemaString,
        }),
        not_after: schemaDate,
        not_before: schemaDate,
        subject: rt.partial({
          common_name: schemaString,
        }),
      }),
    }),
  }),
  url: rt.partial({
    full: schemaString,
  }),
});

// prettier-ignore
export const ObservabilityUptimeAlertFlattenedSchema = rt.intersection([ObservabilityUptimeAlertRequiredFlattened, ObservabilityUptimeAlertOptionalFlattened]);
export type ObservabilityUptimeAlertFlattened = rt.TypeOf<typeof ObservabilityUptimeAlertFlattenedSchema>;

// prettier-ignore
export const ObservabilityUptimeAlertSchema = rt.intersection([ObservabilityUptimeAlertRequired, ObservabilityUptimeAlertOptional]);
export type ObservabilityUptimeAlert = rt.TypeOf<typeof ObservabilityUptimeAlertSchema>;
