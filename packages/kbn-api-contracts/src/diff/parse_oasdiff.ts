/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BreakingChange } from './breaking_rules';
import { getRulePolicy, isPromotedRule } from './rule_policy';

export interface OasdiffEntry {
  id: string;
  text: string;
  level: number;
  operation: string;
  path: string;
  source: string;
  operationId?: string;
  component?: string;
}

const ID_TO_TYPE: Readonly<Record<string, BreakingChange['type']>> = {
  'api-path-removed-without-deprecation': 'path_removed',
  'api-removed-without-deprecation': 'method_removed',
  'api-removed-before-sunset': 'method_removed',
  'request-property-removed': 'request_property_removed',
  'request-parameter-removed': 'parameter_removed',
  'response-required-property-removed': 'response_property_removed',
  'response-optional-property-removed': 'response_property_removed',
  'kbn:request-additional-properties-tightened': 'request_body_tightened',
};

// Warning-level (level 2) rules promoted to blocking, and error-level rules
// demoted to report-only, both come from the declared policy in `rule_policy.ts`.
const isIncluded = ({ id, level }: OasdiffEntry): boolean => level >= 3 || isPromotedRule(id);

const mapEntryToBreakingChange = ({
  id,
  path,
  operation,
  text,
  source,
}: OasdiffEntry): BreakingChange => {
  const type = ID_TO_TYPE[id] ?? 'operation_breaking';
  const policy = getRulePolicy(id);
  return {
    type,
    path,
    method: type === 'path_removed' ? undefined : operation,
    reason: text,
    oasdiffId: id,
    source,
    ...(policy?.disposition === 'report_only'
      ? { reportOnly: true as const, policyReason: policy.reason }
      : {}),
  };
};

export const parseOasdiff = (entries: OasdiffEntry[]): BreakingChange[] =>
  entries.filter(isIncluded).map(mapEntryToBreakingChange);
