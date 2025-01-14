/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSiemRuleType } from './alerts_as_data_rbac';

describe('alertsAsDataRbac', () => {
  describe('isSiemRuleType', () => {
    test('returns true for siem rule types', () => {
      expect(isSiemRuleType('siem.esqlRuleType')).toBe(true);
    });

    test('returns false for NON siem rule types', () => {
      expect(isSiemRuleType('apm.anomaly')).toBe(false);
    });
  });
});
