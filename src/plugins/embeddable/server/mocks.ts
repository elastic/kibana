/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { createEmbeddablePersistableStateServiceMock } from '../common/mocks';
import { EmbeddableSetup, EmbeddableStart } from './plugin';

export const createEmbeddableSetupMock = (): jest.Mocked<EmbeddableSetup> => ({
  ...createEmbeddablePersistableStateServiceMock(),
  registerEmbeddableFactory: jest.fn(),
  registerEnhancement: jest.fn(),
});

export const createEmbeddableStartMock = (): jest.Mocked<EmbeddableStart> =>
  createEmbeddablePersistableStateServiceMock();
