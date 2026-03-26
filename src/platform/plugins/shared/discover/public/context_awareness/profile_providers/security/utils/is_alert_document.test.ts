/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { ALERT_RULE_TYPE_ID } from '@kbn/rule-data-utils';
import { isAlertDocument } from './is_alert_document';

const buildRecord = (fields: Record<string, unknown>): DataTableRecord =>
  ({ flattened: fields, raw: {}, id: 'test-id' } as unknown as DataTableRecord);

describe('isAlertDocument', () => {
  it('returns true for a regular security alert', () => {
    expect(isAlertDocument(buildRecord({ 'event.kind': 'signal' }))).toBe(true);
  });

  it('returns false for a non-alert event', () => {
    expect(isAlertDocument(buildRecord({ 'event.kind': 'event' }))).toBe(false);
  });

  it('returns false when event.kind is absent', () => {
    expect(isAlertDocument(buildRecord({}))).toBe(false);
  });

  it('returns false for a scheduled attack discovery alert', () => {
    expect(
      isAlertDocument(
        buildRecord({
          'event.kind': 'signal',
          [ALERT_RULE_TYPE_ID]: 'attack-discovery',
        })
      )
    ).toBe(false);
  });

  it('returns false for an ad-hoc attack discovery alert', () => {
    expect(
      isAlertDocument(
        buildRecord({
          'event.kind': 'signal',
          [ALERT_RULE_TYPE_ID]: 'attack_discovery_ad_hoc_rule_type_id',
        })
      )
    ).toBe(false);
  });

  it('returns true for a signal with an unrelated rule type', () => {
    expect(
      isAlertDocument(
        buildRecord({
          'event.kind': 'signal',
          [ALERT_RULE_TYPE_ID]: 'siem.queryRule',
        })
      )
    ).toBe(true);
  });
});
