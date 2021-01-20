/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { of } from 'rxjs';
import { SpacesApi } from './api';

const createApiMock = (): jest.Mocked<SpacesApi> => ({
  activeSpace$: of(),
  getActiveSpace: jest.fn(),
});

export const spacesApiMock = {
  create: createApiMock,
};
