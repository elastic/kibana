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
import type { AlertEventRule } from '../types/alert_types';

const mockRule: AlertEventRule = {
  id: 'rule-1',
  name: 'Test Rule',
  tags: ['test'],
  consumer: 'alerts',
  producer: 'infrastructure',
  ruleTypeId: 'metrics.alert.threshold',
};

const makeAlertGroup = (ids: string[]) => ({
  count: ids.length,
  data: ids.map((id) => ({ _id: id, _index: 'test-index' })),
  alert_count: { active: ids.length, recovered: 0, ignored: 0 },
});

describe('buildAlertEvent', () => {
  it('should include only new alerts when ongoing and recovered are empty', () => {
    const alerts = {
      new: makeAlertGroup(['alert-new-1', 'alert-new-2']),
      ongoing: makeAlertGroup([]),
      recovered: makeAlertGroup([]),
      all: makeAlertGroup(['alert-new-1', 'alert-new-2']),
    } as unknown as CombinedSummarizedAlerts;

    const result = buildAlertEvent({ alerts, rule: mockRule, spaceId: 'default' });

    expect(result.alerts).toHaveLength(2);
    expect(result.alerts.map((a) => a._id)).toEqual(['alert-new-1', 'alert-new-2']);
  });

  it('should merge alerts from all three states', () => {
    const alerts = {
      new: makeAlertGroup(['alert-new-1']),
      ongoing: makeAlertGroup(['alert-ongoing-1']),
      recovered: makeAlertGroup(['alert-recovered-1']),
      all: makeAlertGroup(['alert-new-1', 'alert-ongoing-1', 'alert-recovered-1']),
    } as unknown as CombinedSummarizedAlerts;

    const result = buildAlertEvent({ alerts, rule: mockRule, spaceId: 'default' });

    expect(result.alerts).toHaveLength(3);
    expect(result.alerts.map((a) => a._id)).toEqual([
      'alert-new-1',
      'alert-ongoing-1',
      'alert-recovered-1',
    ]);
  });

  it('should handle undefined state data gracefully', () => {
    const alerts = {
      new: { count: 0, data: undefined },
      ongoing: { count: 0, data: undefined },
      recovered: { count: 0, data: undefined },
      all: makeAlertGroup([]),
    } as unknown as CombinedSummarizedAlerts;

    const result = buildAlertEvent({ alerts, rule: mockRule, spaceId: 'default' });

    expect(result.alerts).toEqual([]);
  });

  it('should populate rule information correctly', () => {
    const alerts = {
      new: makeAlertGroup(['alert-1']),
      ongoing: makeAlertGroup([]),
      recovered: makeAlertGroup([]),
      all: makeAlertGroup(['alert-1']),
    } as unknown as CombinedSummarizedAlerts;

    const result = buildAlertEvent({
      alerts,
      rule: mockRule,
      ruleUrl: 'https://kibana/rule/1',
      spaceId: 'my-space',
    });

    expect(result.rule).toEqual(mockRule);
    expect(result.ruleUrl).toBe('https://kibana/rule/1');
    expect(result.spaceId).toBe('my-space');
  });
});
