/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticV3BrowserShipper } from '@kbn/analytics-shippers-elastic-v3-browser';
import { coreMock } from '@kbn/core/public/mocks';
import { homePluginMock } from '@kbn/home-plugin/public/mocks';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import { TelemetryPlugin } from './plugin';

describe('TelemetryPlugin', () => {
  let screenshotMode: ScreenshotModePluginSetup;
  let home: HomePublicPluginSetup;

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
    describe('EBT shipper registration', () => {
      it('registers the UI telemetry shipper', () => {
        const initializerContext = coreMock.createPluginInitializerContext();
        const coreSetupMock = coreMock.createSetup();

        new TelemetryPlugin(initializerContext).setup(coreSetupMock, { screenshotMode, home });

        expect(coreSetupMock.analytics.registerShipper).toHaveBeenCalledWith(
          ElasticV3BrowserShipper,
          { channelName: 'kibana-browser', version: 'version', sendTo: 'staging' }
        );
      });

      it('registers the UI telemetry shipper (pointing to prod)', () => {
        const initializerContext = coreMock.createPluginInitializerContext({ sendUsageTo: 'prod' });
        const coreSetupMock = coreMock.createSetup();

        new TelemetryPlugin(initializerContext).setup(coreSetupMock, { screenshotMode, home });

        expect(coreSetupMock.analytics.registerShipper).toHaveBeenCalledWith(
          ElasticV3BrowserShipper,
          { channelName: 'kibana-browser', version: 'version', sendTo: 'production' }
        );
      });
    });
  });
});
