/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_DASHBOARD_STATE } from './default_dashboard_state';
import { getDashboardApi } from './get_dashboard_api';

describe('initializeSettingsManager', () => {
  describe('anyStateChange$', () => {
    test('should not emit on subscribe and emit when any state changes', (done) => {
      const { api } = getDashboardApi({
        incomingEmbeddables: [],
        initialState: DEFAULT_DASHBOARD_STATE,
      });
      api.anyStateChange$.subscribe(() => {
        try {
          const { title } = api.getSettings();
          expect(title).toBe('Updated title');
        } catch (error) {
          // title assertion fails when
          // anyStateChange$ emits on subscribe
          done(error);
          return;
        }
        done();
      });
      api.setSettings({
        ...api.getSettings(),
        title: 'Updated title',
      });
    });
  });
});
