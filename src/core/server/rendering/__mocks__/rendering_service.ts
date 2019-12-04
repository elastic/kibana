/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { RenderingProvider } from '../rendering_provider';
import { RenderingService as Service } from '../rendering_service';
import { RenderingServiceSetup } from '../types';
import { mockRenderingServiceParams, mockRenderingProviderParams } from './params';

type IRenderingService = { [Public in keyof Service]: Service[Public] };

export const mockGetRenderingProvider = jest
  .fn()
  .mockResolvedValue(new RenderingProvider(mockRenderingProviderParams));
export const setupMock: jest.Mocked<RenderingServiceSetup> = {
  getRenderingProvider: mockGetRenderingProvider,
  getVarsFor: jest.fn().mockResolvedValue({}),
  registerVarProvider: jest.fn(),
};
export const mockSetup = jest.fn().mockResolvedValue(setupMock);
export const mockStart = jest.fn();
export const mockStop = jest.fn();
export const mockRenderingService: jest.Mocked<IRenderingService> = {
  setup: mockSetup,
  start: mockStart,
  stop: mockStop,
};
export const RenderingService = jest.fn<IRenderingService, [typeof mockRenderingServiceParams]>(
  () => mockRenderingService
);
