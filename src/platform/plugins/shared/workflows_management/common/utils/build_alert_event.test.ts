/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CombinedSummarizedAlerts } from '@kbn/alerting-plugin/server/types';
import { buildAlertEvent } from './build_alert_event';

const mockRule = {
  id: 'rule-id',
  name: 'test rule',
  tags: ['test-tag'],
  consumer: 'test-consumer',
  producer: 'test-producer',
  ruleTypeId: 'test-rule-type',
};

const makeAlertGroup = (ids: string[]) => ({
  count: ids.length,
  data: ids.map((id) => ({ _id: id, _index: 'test-index' })),
  alert_count: { active: ids.length, recovered: 0, ignored: 0 },
});

describe('buildAlertEvent', () => {
  it('should merge new, ongoing, and recovered alerts into a flat array', () => {
    const alerts = {
      all: makeAlertGroup(['a1', 'a2', 'a3']),
      new: makeAlertGroup(['a1']),
      ongoing: makeAlertGroup(['a2']),
      recovered: makeAlertGroup(['a3']),
    } as unknown as CombinedSummarizedAlerts;

    const result = buildAlertEvent({ alerts, rule: mockRule, spaceId: 'default' });

    expect(result.alerts).toHaveLength(3);
    expect(result.alerts.map((a) => a._id)).toEqual(['a1', 'a2', 'a3']);
  });

  it('should return only new alerts when ongoing and recovered are empty', () => {
    const alerts = {
      all: makeAlertGroup(['a1']),
      new: makeAlertGroup(['a1']),
      ongoing: makeAlertGroup([]),
      recovered: makeAlertGroup([]),
    } as unknown as CombinedSummarizedAlerts;

    const result = buildAlertEvent({ alerts, rule: mockRule, spaceId: 'default' });

    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]._id).toBe('a1');
  });

  it('should handle undefined data gracefully', () => {
    const alerts = {
      all: { count: 0, data: [] },
      new: { count: 0, data: undefined },
      ongoing: { count: 0, data: undefined },
      recovered: { count: 0, data: undefined },
    } as unknown as CombinedSummarizedAlerts;

    const result = buildAlertEvent({ alerts, rule: mockRule, spaceId: 'default' });

    expect(result.alerts).toEqual([]);
  });

  it('should include rule information', () => {
    const alerts = {
      all: makeAlertGroup([]),
      new: makeAlertGroup([]),
      ongoing: makeAlertGroup([]),
      recovered: makeAlertGroup([]),
    } as unknown as CombinedSummarizedAlerts;

    const result = buildAlertEvent({
      alerts,
      rule: mockRule,
      ruleUrl: 'https://example.com/rule',
      spaceId: 'my-space',
    });

    expect(result.rule).toEqual(mockRule);
    expect(result.ruleUrl).toBe('https://example.com/rule');
    expect(result.spaceId).toBe('my-space');
  });

  it('should handle missing ruleUrl', () => {
    const alerts = {
      all: makeAlertGroup([]),
      new: makeAlertGroup([]),
      ongoing: makeAlertGroup([]),
      recovered: makeAlertGroup([]),
    } as unknown as CombinedSummarizedAlerts;

    const result = buildAlertEvent({ alerts, rule: mockRule, spaceId: 'default' });

    expect(result.ruleUrl).toBeUndefined();
  });
});
