/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PublicMethodsOf } from '@kbn/utility-types';
import { WelcomeService, WelcomeServiceSetup } from './welcome_service';

const createSetupMock = (): jest.Mocked<WelcomeServiceSetup> => {
  const welcomeService = new WelcomeService();
  const welcomeServiceSetup = welcomeService.setup();
  return {
    registerTelemetryNoticeRenderer: jest
      .fn()
      .mockImplementation(welcomeServiceSetup.registerTelemetryNoticeRenderer),
    registerOnRendered: jest.fn().mockImplementation(welcomeServiceSetup.registerOnRendered),
  };
};

const createMock = (): jest.Mocked<PublicMethodsOf<WelcomeService>> => {
  const welcomeService = new WelcomeService();

  return {
    setup: jest.fn().mockImplementation(welcomeService.setup),
    onRendered: jest.fn().mockImplementation(welcomeService.onRendered),
    renderTelemetryNotice: jest.fn().mockImplementation(welcomeService.renderTelemetryNotice),
  };
};

export const welcomeServiceMock = {
  createSetup: createSetupMock,
  create: createMock,
};
