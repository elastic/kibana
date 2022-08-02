/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs/operators';
import { coreMock } from '@kbn/core/public/mocks';
import { NewsfeedPublicPlugin } from './plugin';
import { NewsfeedApiEndpoint } from './lib/api';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';

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

    beforeEach(() => {
      /**
       * We assume for these tests that the newsfeed stream exposed by start will fetch newsfeed items
       * on the first tick for new subscribers
       */
      jest.spyOn(window, 'fetch');
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    describe('base case', () => {
      it('makes fetch requests', () => {
        const startContract = plugin.start(coreMock.createStart(), {
          screenshotMode: screenshotModePluginMock.createSetupContract(),
        });
        const sub = startContract
          .createNewsFeed$(NewsfeedApiEndpoint.KIBANA) // Any endpoint will do
          .pipe(take(1))
          .subscribe(() => {});
        jest.runOnlyPendingTimers();
        expect(window.fetch).toHaveBeenCalled();
        sub.unsubscribe();
      });
    });

    describe('when in screenshot mode', () => {
      it('makes no fetch requests in screenshot mode', () => {
        const screenshotMode = screenshotModePluginMock.createSetupContract();
        screenshotMode.isScreenshotMode.mockReturnValue(true);
        const startContract = plugin.start(coreMock.createStart(), {
          screenshotMode,
        });
        const sub = startContract
          .createNewsFeed$(NewsfeedApiEndpoint.KIBANA) // Any endpoint will do
          .pipe(take(1))
          .subscribe(() => {});
        jest.runOnlyPendingTimers();
        expect(window.fetch).not.toHaveBeenCalled();
        sub.unsubscribe();
      });
    });
  });
});
