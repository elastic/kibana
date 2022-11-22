/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '@kbn/core-http-browser';
import {
  testGuideConfig,
  testGuideNotActiveState,
  testGuideStep1InProgressState,
  testGuideStep2InProgressState,
  testIntegration,
  wrongIntegration,
} from './api.mocks';

import { ConfigService } from './config_service';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

describe('isIntegrationInGuideStep', () => {
  let configService: ConfigService;
  let httpClient: jest.Mocked<HttpSetup>;

  beforeEach(() => {
    httpClient = httpServiceMock.createStartContract({ basePath: '/base/path' });
    httpClient.get.mockResolvedValue({
      configs: {
        testGuide: testGuideConfig,
      },
    });
    configService = new ConfigService();
    configService.setup(httpClient);
  });

  it('return true if the integration is defined in the guide step config', async () => {
    const result = await configService.isIntegrationInGuideStep(
      testGuideStep1InProgressState,
      testIntegration
    );
    expect(result).toBe(true);
  });
  it('returns false if a different integration is defined in the guide step', async () => {
    const result = await configService.isIntegrationInGuideStep(
      testGuideStep1InProgressState,
      wrongIntegration
    );
    expect(result).toBe(false);
  });
  it('returns false if no integration is defined in the guide step', async () => {
    const result = await configService.isIntegrationInGuideStep(
      testGuideStep2InProgressState,
      testIntegration
    );
    expect(result).toBe(false);
  });
  it('returns false if no guide is active', async () => {
    const result = await configService.isIntegrationInGuideStep(
      testGuideNotActiveState,
      testIntegration
    );
    expect(result).toBe(false);
  });
  it('returns false if no integration passed', async () => {
    const result = await configService.isIntegrationInGuideStep(testGuideStep1InProgressState);
    expect(result).toBe(false);
  });
});
