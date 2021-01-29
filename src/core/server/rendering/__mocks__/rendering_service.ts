/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { RenderingService as Service } from '../rendering_service';
import type { InternalRenderingServiceSetup } from '../types';
import { mockRenderingServiceParams } from './params';

type IRenderingService = PublicMethodsOf<Service>;

export const setupMock: jest.Mocked<InternalRenderingServiceSetup> = {
  render: jest.fn(),
};
export const mockSetup = jest.fn().mockResolvedValue(setupMock);
export const mockStop = jest.fn();
export const mockRenderingService: jest.Mocked<IRenderingService> = {
  setup: mockSetup,
  stop: mockStop,
};
export const RenderingService = jest.fn<IRenderingService, [typeof mockRenderingServiceParams]>(
  () => mockRenderingService
);
