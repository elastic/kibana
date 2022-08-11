/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { AppUpdater } from '@kbn/core/public';
import { BehaviorSubject, Observable } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { DiscoverSetupPlugins } from '../plugin';
import { initializeKbnUrlTracking } from './initialize_kbn_url_tracking';

describe('initializeKbnUrlTracking', () => {
  test('returns functions to start and stop url tracking', async () => {
    const pluginsSetup = {
      data: {
        query: {
          state$: new Observable(),
        },
      },
    } as DiscoverSetupPlugins;
    const result = initializeKbnUrlTracking(
      '',
      coreMock.createSetup(),
      new BehaviorSubject<AppUpdater>(() => ({})),
      pluginsSetup
    );
    expect(result).toMatchInlineSnapshot(`
      Object {
        "appMounted": [Function],
        "appUnMounted": [Function],
        "restorePreviousUrl": [Function],
        "setTrackedUrl": [Function],
        "stopUrlTracker": [Function],
      }
    `);
  });
});
