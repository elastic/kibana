/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type RuleDisposition = 'blocking' | 'report_only';

export interface RulePolicyEntry {
  disposition: RuleDisposition;
  reason: string;
}

/** Rules not listed here keep oasdiff's level: errors gate, warnings are dropped. */
export const OASDIFF_RULE_POLICY: Readonly<Record<string, RulePolicyEntry>> = {
  'request-property-removed': {
    disposition: 'blocking',
    reason: 'Removing a request property breaks any client that sends it.',
  },
  'request-parameter-removed': {
    disposition: 'blocking',
    reason: 'Removing a request parameter breaks any client that sends it.',
  },
  'response-optional-property-removed': {
    disposition: 'blocking',
    reason: 'Removing an optional response property breaks any client that reads it.',
  },
  'response-property-one-of-added': {
    disposition: 'report_only',
    reason:
      'Adding a variant to a response oneOf is additive. Clients keep receiving the variants they already handle, so this is reported for awareness rather than gated. See https://github.com/elastic/kibana/pull/287992.',
  },
  'response-body-one-of-added': {
    disposition: 'report_only',
    reason:
      'Adding a variant to a response body oneOf is additive. Clients keep receiving the variants they already handle, so this is reported for awareness rather than gated. See https://github.com/elastic/kibana/pull/287992.',
  },
  'response-property-enum-value-added': {
    disposition: 'report_only',
    reason:
      'Adding a value to a response enum is additive. Clients keep receiving the values they already handle, so this is reported for awareness rather than gated. See https://github.com/elastic/kibana/pull/287992.',
  },
};

/** Kibana's declared policy for an oasdiff rule, if it has one. */
export const getRulePolicy = (id: string): RulePolicyEntry | undefined => OASDIFF_RULE_POLICY[id];

/** True when the declared policy treats this rule as blocking. */
export const isPromotedRule = (id: string): boolean =>
  getRulePolicy(id)?.disposition === 'blocking';

/** True when an oasdiff rule is reported but does not gate the build. */
export const isReportOnlyRule = (id: string): boolean =>
  getRulePolicy(id)?.disposition === 'report_only';
