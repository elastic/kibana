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

    test('it should handle onRendered errors', () => {
      const onRendered = jest.fn().mockImplementation(() => {
        throw new Error('Something went terribly wrong');
      });
      welcomeServiceSetup.registerOnRendered(onRendered);

      expect(() => welcomeService.onRendered()).not.toThrow();
      expect(onRendered).toHaveBeenCalledTimes(1);
    });

    test('it should allow registering multiple onRendered listeners', () => {
      const onRendered = jest.fn();
      const onRendered2 = jest.fn();
      welcomeServiceSetup.registerOnRendered(onRendered);
      welcomeServiceSetup.registerOnRendered(onRendered2);

      welcomeService.onRendered();
      expect(onRendered).toHaveBeenCalledTimes(1);
      expect(onRendered2).toHaveBeenCalledTimes(1);
    });

    test('if the same handler is registered twice, it is called twice', () => {
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

    test('it should fail to register a 2nd renderer and still use the first registered renderer', () => {
      const renderer = jest.fn().mockReturnValue('rendered text');
      const renderer2 = jest.fn().mockReturnValue('other text');
      welcomeServiceSetup.registerTelemetryNoticeRenderer(renderer);
      expect(() => welcomeServiceSetup.registerTelemetryNoticeRenderer(renderer2)).toThrowError(
        'Only one renderTelemetryNotice handler can be registered'
      );

      expect(welcomeService.renderTelemetryNotice()).toEqual('rendered text');
    });

    test('it should handle errors in the renderer', () => {
      const renderer = jest.fn().mockImplementation(() => {
        throw new Error('Something went terribly wrong');
      });
      welcomeServiceSetup.registerTelemetryNoticeRenderer(renderer);

      expect(welcomeService.renderTelemetryNotice()).toEqual(null);
    });
  });
});
