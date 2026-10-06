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
  isIgnoredRule,
  isPromotedRule,
  isReportOnlyRule,
} from './rule_policy';
import type { RuleDisposition } from './rule_policy';

const predicates: Record<RuleDisposition, (id: string) => boolean> = {
  blocking: isPromotedRule,
  report_only: isReportOnlyRule,
  ignore: isIgnoredRule,
};

// Exactly one predicate matches a listed rule's disposition, and none match an unlisted rule.
const expectOnly = (id: string, disposition?: RuleDisposition) => {
  Object.entries(predicates).forEach(([name, predicate]) => {
    expect(predicate(id)).toBe(name === disposition);
  });
};

describe('OASDIFF_RULE_POLICY', () => {
  it.each<[string, RuleDisposition]>([
    ['request-property-removed', 'blocking'],
    ['request-parameter-removed', 'blocking'],
    ['response-optional-property-removed', 'blocking'],
    ['response-property-one-of-added', 'report_only'],
    ['response-body-one-of-added', 'report_only'],
    ['response-property-enum-value-added', 'report_only'],
  ])('declares %s as %s', (id, disposition) => {
    expect(getRulePolicy(id)?.disposition).toBe(disposition);
    expectOnly(id, disposition);
  });

  it('gives every entry a reason', () => {
    const withoutReason = Object.entries(OASDIFF_RULE_POLICY)
      .filter(([, { reason }]) => reason.length === 0)
      .map(([id]) => id);

    expect(withoutReason).toEqual([]);
  });

  it('keeps every request-side entry blocking', () => {
    const notBlocking = Object.entries(OASDIFF_RULE_POLICY)
      .filter(([id, { disposition }]) => id.startsWith('request-') && disposition !== 'blocking')
      .map(([id]) => id);

    expect(notBlocking).toEqual([]);
  });

  it('leaves unlisted rules to oasdiff', () => {
    expect(getRulePolicy('api-removed-without-deprecation')).toBeUndefined();
    expectOnly('api-removed-without-deprecation');
  });

  describe('ignore disposition', () => {
    const IGNORED_ID = 'test-only-ignored-rule';

    beforeAll(() => {
      Object.assign(OASDIFF_RULE_POLICY, {
        [IGNORED_ID]: {
          disposition: 'ignore',
          reason: 'Additive change with no consumer impact for Kibana.',
        },
      });
    });

    afterAll(() => {
      Reflect.deleteProperty(OASDIFF_RULE_POLICY, IGNORED_ID);
    });

    it('is ignored and neither blocking nor report-only', () => {
      expectOnly(IGNORED_ID, 'ignore');
    });
  });
});
