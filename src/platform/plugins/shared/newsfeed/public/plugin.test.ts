/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { take } from 'rxjs';
import { coreMock } from '@kbn/core/public/mocks';
import { NewsfeedPublicPlugin } from './plugin';
import { NewsfeedApiEndpoint } from './lib/api';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import type { NewsfeedPluginBrowserConfig } from './types';

const createPlugin = (config?: Partial<NewsfeedPluginBrowserConfig>) => {
  return new NewsfeedPublicPlugin(
    coreMock.createPluginInitializerContext({
      enabled: true,
      service: {
        urlRoot: 'https://feeds.elastic.co',
        pathTemplate: '/kibana/v{VERSION}.json',
      },
      mainInterval: '2m',
      fetchInterval: '1d',
      ...config,
    })
  );
};

describe('Newsfeed plugin', () => {
  let plugin: NewsfeedPublicPlugin;

  beforeAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    plugin = createPlugin();
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

      it('exposes whether newsfeed is enabled', () => {
        plugin = createPlugin({ enabled: false });
        plugin.setup(coreMock.createSetup());

        const startContract = plugin.start(coreMock.createStart(), {
          screenshotMode: screenshotModePluginMock.createSetupContract(),
        });

        expect(startContract.isEnabled).toBe(false);
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
