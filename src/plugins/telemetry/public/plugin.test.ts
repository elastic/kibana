/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
/* eslint-disable dot-notation */
import { of } from 'rxjs';
import { ElasticV3BrowserShipper } from '@elastic/ebt/shippers/elastic_v3/browser';
import { coreMock } from '@kbn/core/public/mocks';
import { homePluginMock } from '@kbn/home-plugin/public/mocks';
import { screenshotModePluginMock } from '@kbn/screenshot-mode-plugin/public/mocks';
import { HomePublicPluginSetup } from '@kbn/home-plugin/public';
import { ScreenshotModePluginSetup } from '@kbn/screenshot-mode-plugin/public';
import { buildShipperHeaders } from '../common/ebt_v3_endpoint';
import { isSyntheticsMonitorMock } from './plugin.test.mock';
import { TelemetryPlugin } from './plugin';

describe('TelemetryPlugin', () => {
  let screenshotMode: ScreenshotModePluginSetup;
  let home: HomePublicPluginSetup;

  beforeEach(() => {
    screenshotMode = screenshotModePluginMock.createSetupContract();
    home = homePluginMock.createSetupContract();
    isSyntheticsMonitorMock.mockReturnValue(false);
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
        const telemetryPlugin = new TelemetryPlugin(initializerContext);

        telemetryPlugin['getSendToEnv'] = jest.fn();
        telemetryPlugin.setup(coreSetupMock, { screenshotMode, home });

        expect(telemetryPlugin['getSendToEnv']).toHaveBeenCalledTimes(1);
        expect(telemetryPlugin['getSendToEnv']).toHaveBeenCalledWith(undefined);

        expect(coreSetupMock.analytics.registerShipper).toHaveBeenCalledWith(
          ElasticV3BrowserShipper,
          {
            channelName: 'kibana-browser',
            version: 'version',
            buildShipperUrl: expect.any(Function),
            buildShipperHeaders,
          }
        );
      });

      it('registers the UI telemetry shipper (pointing to prod)', () => {
        const initializerContext = coreMock.createPluginInitializerContext({ sendUsageTo: 'prod' });
        const coreSetupMock = coreMock.createSetup();
        const telemetryPlugin = new TelemetryPlugin(initializerContext);

        telemetryPlugin['getSendToEnv'] = jest.fn();
        telemetryPlugin.setup(coreSetupMock, { screenshotMode, home });

        expect(telemetryPlugin['getSendToEnv']).toHaveBeenCalledTimes(1);
        expect(telemetryPlugin['getSendToEnv']).toHaveBeenCalledWith('prod');

        expect(coreSetupMock.analytics.registerShipper).toHaveBeenCalledWith(
          ElasticV3BrowserShipper,
          {
            channelName: 'kibana-browser',
            version: 'version',
            buildShipperUrl: expect.any(Function),
            buildShipperHeaders,
          }
        );
      });
    });

    it('disables telemetry when in screenshot mode', async () => {
      const initializerContext = coreMock.createPluginInitializerContext();

      const plugin = new TelemetryPlugin(initializerContext);
      const isScreenshotModeSpy = jest
        .spyOn(screenshotMode, 'isScreenshotMode')
        .mockReturnValue(true);
      plugin.setup(coreMock.createSetup(), { screenshotMode, home });
      expect(isScreenshotModeSpy).toBeCalledTimes(1);

      const coreStartMock = coreMock.createStart();
      coreStartMock.application = { ...coreStartMock.application, currentAppId$: of('some-app') };
      const optInSpy = jest.spyOn(coreStartMock.analytics, 'optIn');
      plugin.start(coreStartMock, { screenshotMode });
      expect(isScreenshotModeSpy).toBeCalledTimes(2);
      expect(optInSpy).toBeCalledTimes(1);
      expect(optInSpy).toHaveBeenCalledWith({ global: { enabled: false } });
    });

    it('disables telemetry when the user agent contains Elastic/Synthetics', async () => {
      const initializerContext = coreMock.createPluginInitializerContext();

      const plugin = new TelemetryPlugin(initializerContext);
      const isScreenshotModeSpy = jest
        .spyOn(screenshotMode, 'isScreenshotMode')
        .mockReturnValue(false);
      plugin.setup(coreMock.createSetup(), { screenshotMode, home });
      expect(isScreenshotModeSpy).toBeCalledTimes(1);

      const coreStartMock = coreMock.createStart();
      coreStartMock.application = { ...coreStartMock.application, currentAppId$: of('some-app') };
      isSyntheticsMonitorMock.mockReturnValueOnce(true);
      const optInSpy = jest.spyOn(coreStartMock.analytics, 'optIn');
      plugin.start(coreStartMock, { screenshotMode });
      expect(isScreenshotModeSpy).toBeCalledTimes(2);
      expect(optInSpy).toBeCalledTimes(1);
      expect(optInSpy).toHaveBeenCalledWith({ global: { enabled: false } });
    });
  });
});
