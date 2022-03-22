/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TelemetryPlugin } from './plugin';
import { coreMock } from '../../../core/public/mocks';
import { screenshotModeMock, homeMock, cloudMock } from './plugin.test.mocks';

const mockInitializerContext = coreMock.createPluginInitializerContext();

describe('TelemetryPublicPlugin', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('setup', () => {
    it('registers the telemetry notice renderer for a fresh on-prem instance', async () => {
      await new TelemetryPlugin(mockInitializerContext).setup(coreMock.createSetup(), {
        screenshotMode: screenshotModeMock,
        home: homeMock,
      });

      expect(homeMock.welcomeScreen.registerTelemetryNoticeRenderer).toHaveBeenCalledTimes(1);
    });

    it('does not register the telemetry notice renderer for a cloud instance', async () => {
      await new TelemetryPlugin(mockInitializerContext).setup(coreMock.createSetup(), {
        screenshotMode: screenshotModeMock,
        home: homeMock,
        cloud: cloudMock,
      });

      expect(homeMock.welcomeScreen.registerTelemetryNoticeRenderer).not.toBeCalled();
    });
  });
});
