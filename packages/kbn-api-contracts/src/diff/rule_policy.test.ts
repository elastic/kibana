/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  OASDIFF_RULE_POLICY,
  getRulePolicy,
  isPromotedRule,
  isReportOnlyRule,
} from './rule_policy';

describe('OASDIFF_RULE_POLICY', () => {
  it('gives every rule a reason', () => {
    Object.entries(OASDIFF_RULE_POLICY).forEach(([id, { reason }]) => {
      expect(reason.length).toBeGreaterThan(0);
      expect(id).not.toHaveLength(0);
    });
  });

  it('keeps the request side strict', () => {
    const demotedRequestRules = Object.keys(OASDIFF_RULE_POLICY).filter(
      (id) => id.startsWith('request-') && isReportOnlyRule(id)
    );

    expect(demotedRequestRules).toEqual([]);
  });

  it('promotes the request and response removal warnings', () => {
    expect(isPromotedRule('request-property-removed')).toBe(true);
    expect(isPromotedRule('request-parameter-removed')).toBe(true);
    expect(isPromotedRule('response-optional-property-removed')).toBe(true);
  });

  it('demotes additive response oneOf rules to report-only', () => {
    expect(isReportOnlyRule('response-property-one-of-added')).toBe(true);
    expect(isReportOnlyRule('response-body-one-of-added')).toBe(true);
  });

  it('demotes an added response enum value to report-only', () => {
    expect(isReportOnlyRule('response-property-enum-value-added')).toBe(true);
    expect(isPromotedRule('response-property-enum-value-added')).toBe(false);
  });

  it('leaves unlisted rules to oasdiff', () => {
    expect(getRulePolicy('api-removed-without-deprecation')).toBeUndefined();
    expect(isPromotedRule('api-removed-without-deprecation')).toBe(false);
    expect(isReportOnlyRule('api-removed-without-deprecation')).toBe(false);
  });
});
