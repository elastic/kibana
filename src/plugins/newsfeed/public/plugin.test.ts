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

    /**
     * We assume for these tests that the newsfeed stream exposed by start will fetch newsfeed items
     * on the first tick for new subscribers
     */
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

    describe('base case', () => {
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
    });

    describe('when in screenshot mode', () => {
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
