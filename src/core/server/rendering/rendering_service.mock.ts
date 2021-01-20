/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { InternalRenderingServiceSetup } from './types';

function createRenderingSetup() {
  const mocked: jest.Mocked<InternalRenderingServiceSetup> = {
    render: jest.fn().mockResolvedValue('<body />'),
  };
  return mocked;
}

export const renderingMock = {
  createSetupContract: createRenderingSetup,
};
