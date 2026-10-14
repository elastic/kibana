/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { initializeDrilldownsManager } from './drilldowns_manager';

describe('initializeDrilldownsManager', () => {
  describe('anyStateChange$', () => {
    test('should not emit on subscribe and emit when any state changes', (done) => {
      const { anyStateChange$, api, getLatestState } = initializeDrilldownsManager('embeddable1', {
        drilldowns: [],
      });
      anyStateChange$.subscribe(() => {
        try {
          const { drilldowns } = getLatestState();
          expect(drilldowns?.length).toBe(1);
        } catch (error) {
          // drilldowns assertion fails when
          // anyStateChange$ emits on subscribe
          done(error);
          return;
        }
        done();
      });
      api.setDrilldowns([{ label: 'myDrilldown', trigger: 'on_click', type: 'test_drilldown' }]);
    });
  });
});
