/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isSavedObjectIndex } from '../lib/indices/kibana_index';

describe('loadAction - dataOnly validation', () => {
  describe('isSavedObjectIndex', () => {
    it('should identify .kibana saved object indices', () => {
      expect(isSavedObjectIndex('.kibana_8.17.0_001')).toBe(true);
      expect(isSavedObjectIndex('.kibana_task_manager_8.17.0_001')).toBe(true);
      expect(isSavedObjectIndex('.kibana')).toBe(true);
      expect(isSavedObjectIndex('.kibana_1')).toBe(true);
    });

    it('should not flag non-saved-object indices', () => {
      expect(isSavedObjectIndex('logs-test')).toBe(false);
      expect(isSavedObjectIndex('metrics-test')).toBe(false);
      expect(isSavedObjectIndex('.kibana_security_session_1')).toBe(false);
      expect(isSavedObjectIndex(undefined)).toBe(false);
    });
  });
});
