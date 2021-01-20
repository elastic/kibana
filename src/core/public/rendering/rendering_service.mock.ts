/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { RenderingService } from './rendering_service';

type RenderingServiceContract = PublicMethodsOf<RenderingService>;
const createMock = () => {
  const mocked: jest.Mocked<RenderingServiceContract> = {
    start: jest.fn(),
  };
  return mocked;
};

export const renderingServiceMock = {
  create: createMock,
};
