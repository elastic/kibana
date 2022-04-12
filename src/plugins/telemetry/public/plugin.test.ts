/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TelemetryPlugin } from './plugin';
import { coreMock } from '../../../core/public/mocks';
import { homePluginMock } from '../../home/public/mocks';
import { screenshotModePluginMock } from '../../screenshot_mode/public/mocks';
import { HomePublicPluginSetup } from '../../home/public';
import { ScreenshotModePluginSetup } from '../../screenshot_mode/public';

let screenshotMode: ScreenshotModePluginSetup;
let home: HomePublicPluginSetup;

describe('TelemetryPlugin', () => {
  beforeEach(() => {
    screenshotMode = screenshotModePluginMock.createSetupContract();
    home = homePluginMock.createSetupContract();
  });

  describe('setup', () => {
    describe('when home is provided', () => {
      describe('and hidePrivacyStatement is false (default)', () => {
        it('registers the telemetry notice renderer and onRendered handlers', () => {
          const initializerContext = coreMock.createPluginInitializerContext();

          new TelemetryPlugin(initializerContext).setup(coreMock.createSetup(), {
            screenshotMode,
            home,
          });

          expect(home.welcomeScreen.registerTelemetryNoticeRenderer).toHaveBeenCalledWith(
            expect.any(Function)
          );
          expect(home.welcomeScreen.registerOnRendered).toHaveBeenCalledWith(expect.any(Function));
        });
      });

      describe('and hidePrivacyStatement is true', () => {
        it('does not register the telemetry notice renderer and onRendered handlers', () => {
          const initializerContext = coreMock.createPluginInitializerContext({
            hidePrivacyStatement: true,
          });

          new TelemetryPlugin(initializerContext).setup(coreMock.createSetup(), {
            screenshotMode,
            home,
          });

          expect(home.welcomeScreen.registerTelemetryNoticeRenderer).not.toBeCalled();
          expect(home.welcomeScreen.registerOnRendered).not.toBeCalled();
        });
      });
    });
  });
});
