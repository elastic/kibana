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
import type { Either } from 'fp-ts/lib/Either';
import { AlertSchema } from './alert_schema';
import { EcsSchema } from './ecs_schema';
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
const SecurityAttackDiscoveryAlertRequired = rt.type({
  '@timestamp': schemaDate,
  'kibana.alert.attack_discovery.alert_ids': schemaStringArray,
  'kibana.alert.attack_discovery.alerts_context_count': schemaNumber,
  'kibana.alert.attack_discovery.api_config': schemaUnknown,
  'kibana.alert.attack_discovery.details_markdown': schemaString,
  'kibana.alert.attack_discovery.details_markdown_with_replacements': schemaString,
  'kibana.alert.attack_discovery.summary_markdown': schemaString,
  'kibana.alert.attack_discovery.summary_markdown_with_replacements': schemaString,
  'kibana.alert.attack_discovery.title': schemaString,
  'kibana.alert.attack_discovery.title_with_replacements': schemaString,
  'kibana.alert.attack_discovery.users.id': schemaString,
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
// prettier-ignore
const SecurityAttackDiscoveryAlertOptional = rt.partial({
  'event.action': schemaString,
  'event.kind': schemaString,
  'event.original': schemaString,
  'kibana.alert.action_group': schemaString,
  'kibana.alert.attack_discovery.api_config.model': schemaString,
  'kibana.alert.attack_discovery.api_config.provider': schemaString,
  'kibana.alert.attack_discovery.entity_summary_markdown': schemaString,
  'kibana.alert.attack_discovery.entity_summary_markdown_with_replacements': schemaString,
  'kibana.alert.attack_discovery.mitre_attack_tactics': schemaStringArray,
  'kibana.alert.attack_discovery.replacements': schemaUnknown,
  'kibana.alert.attack_discovery.user.id': schemaString,
  'kibana.alert.attack_discovery.users': rt.array(
    rt.partial({
      name: schemaString,
    })
  ),
  'kibana.alert.case_ids': schemaStringArray,
  'kibana.alert.consecutive_matches': schemaStringOrNumber,
  'kibana.alert.duration.us': schemaStringOrNumber,
  'kibana.alert.end': schemaDate,
  'kibana.alert.flapping': schemaBoolean,
  'kibana.alert.flapping_history': schemaBooleanArray,
  'kibana.alert.intended_timestamp': schemaDate,
  'kibana.alert.last_detected': schemaDate,
  'kibana.alert.maintenance_window_ids': schemaStringArray,
  'kibana.alert.pending_recovered_count': schemaStringOrNumber,
  'kibana.alert.previous_action_group': schemaString,
  'kibana.alert.reason': schemaString,
  'kibana.alert.risk_score': schemaNumber,
  'kibana.alert.rule.execution.timestamp': schemaDate,
  'kibana.alert.rule.execution.type': schemaString,
  'kibana.alert.rule.execution.uuid': schemaString,
  'kibana.alert.rule.parameters': schemaUnknown,
  'kibana.alert.rule.tags': schemaStringArray,
  'kibana.alert.severity_improving': schemaBoolean,
  'kibana.alert.start': schemaDate,
  'kibana.alert.time_range': schemaDateRange,
  'kibana.alert.url': schemaString,
  'kibana.alert.workflow_assignee_ids': schemaStringArray,
  'kibana.alert.workflow_status': schemaString,
  'kibana.alert.workflow_tags': schemaStringArray,
  'kibana.version': schemaString,
  tags: schemaStringArray,
});

// prettier-ignore
export const SecurityAttackDiscoveryAlertSchema = rt.intersection([SecurityAttackDiscoveryAlertRequired, SecurityAttackDiscoveryAlertOptional, AlertSchema, EcsSchema]);
// prettier-ignore
export type SecurityAttackDiscoveryAlert = rt.TypeOf<typeof SecurityAttackDiscoveryAlertSchema>;
