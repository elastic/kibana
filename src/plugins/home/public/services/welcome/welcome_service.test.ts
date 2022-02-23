/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { WelcomeService, WelcomeServiceSetup } from './welcome_service';

describe('WelcomeService', () => {
  let welcomeService: WelcomeService;
  let welcomeServiceSetup: WelcomeServiceSetup;

  beforeEach(() => {
    welcomeService = new WelcomeService();
    welcomeServiceSetup = welcomeService.setup();
  });
  describe('onRendered', () => {
    test('it should register an onRendered listener', () => {
      const onRendered = jest.fn();
      welcomeServiceSetup.registerOnRendered(onRendered);

      welcomeService.onRendered();
      expect(onRendered).toHaveBeenCalledTimes(1);
    });

    test('it should allow registering multiple onRendered listeners', () => {
      const onRendered = jest.fn();
      welcomeServiceSetup.registerOnRendered(onRendered);
      welcomeServiceSetup.registerOnRendered(onRendered);

      welcomeService.onRendered();
      expect(onRendered).toHaveBeenCalledTimes(2);
    });
  });
  describe('renderTelemetryNotice', () => {
    test('it should register a renderer', () => {
      const renderer = jest.fn().mockReturnValue('rendered text');
      welcomeServiceSetup.registerTelemetryNoticeRenderer(renderer);

      expect(welcomeService.renderTelemetryNotice()).toEqual('rendered text');
    });

    test('it should use the last registered renderer', () => {
      const renderer = jest.fn().mockReturnValue('rendered text');
      const renderer2 = jest.fn().mockReturnValue('other text');
      welcomeServiceSetup.registerTelemetryNoticeRenderer(renderer);
      welcomeServiceSetup.registerTelemetryNoticeRenderer(renderer2);

      expect(welcomeService.renderTelemetryNotice()).toEqual('other text');
    });
  });
});
