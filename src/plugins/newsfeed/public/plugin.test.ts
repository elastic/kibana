/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs/operators';
import { coreMock } from '../../../core/public/mocks';
import { NewsfeedPublicPlugin } from './plugin';
import { NewsfeedApiEndpoint } from './lib/api';

describe('Newsfeed plugin', () => {
  let plugin: NewsfeedPublicPlugin;

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    plugin = new NewsfeedPublicPlugin(coreMock.createPluginInitializerContext());
  });

  describe('#start', () => {
    beforeEach(() => {
      plugin.setup(coreMock.createSetup());
    });

    describe('screenshot mode', () => {
      it('mounts chrome nav UI', () => {
        const coreStart = coreMock.createStart();
        plugin.start(coreStart, { screenshotMode: { isScreenshotMode: () => false } });
        expect(coreStart.chrome.navControls.registerRight).toHaveBeenCalled();
      });

      it('does not mount chrome nav UI when in screenshot mode', () => {
        const coreStart = coreMock.createStart();
        plugin.start(coreStart, { screenshotMode: { isScreenshotMode: () => true } });
        expect(coreStart.chrome.navControls.registerRight).not.toHaveBeenCalled();
      });

      /**
       * We assume for these tests that the newsfeed stream exposed by start will fetch newsfeed items
       * on the first tick for new subscribers
       */
      describe('fetch newsfeed requests', () => {
        let fakeFetch: jest.Mock;
        let realFetch: typeof window.fetch;

        beforeEach(() => {
          realFetch = window.fetch;
          fakeFetch = jest.fn();
          window.fetch = fakeFetch;
        });

        afterEach(() => {
          window.fetch = realFetch;
        });

        it('makes fetch requests', async () => {
          const startContract = plugin.start(coreMock.createStart(), {
            screenshotMode: { isScreenshotMode: () => false },
          });
          const sub = startContract
            .createNewsFeed$(NewsfeedApiEndpoint.KIBANA) // Any endpoint will do
            .pipe(take(1))
            .subscribe(() => {});
          jest.runOnlyPendingTimers();
          expect(fakeFetch).toHaveBeenCalled();
          sub.unsubscribe();
        });

        it('makes no fetch requests in screenshot mode', async () => {
          const startContract = plugin.start(coreMock.createStart(), {
            screenshotMode: { isScreenshotMode: () => true },
          });
          const sub = startContract
            .createNewsFeed$(NewsfeedApiEndpoint.KIBANA) // Any endpoint will do
            .pipe(take(1))
            .subscribe(() => {});
          jest.runOnlyPendingTimers();
          expect(fakeFetch).not.toHaveBeenCalled();
          sub.unsubscribe();
        });
      });
    });
  });
});
