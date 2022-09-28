/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

jest.mock('./services/api');
import { ApiService } from './services/api';

const mockApi = ApiService as unknown as jest.Mocked<ApiService>;
import { GuidedOnboardingPluginStart } from '.';

const startMock: jest.Mocked<GuidedOnboardingPluginStart> = {
  guidedOnboardingApi: mockApi,
};

export const guidedOnboardingMock = {
  createSetup: () => {},
  createStart: () => startMock,
};
