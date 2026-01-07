/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// import { createEmbeddablePersistableStateServiceMock } from '../common/mocks';
import type { EmbeddableSetup, EmbeddableStart } from './types';

export const createEmbeddableSetupMock = (): jest.Mocked<EmbeddableSetup> => ({
  registerTransforms: jest.fn(),
  registerEnhancement: jest.fn(),
  transformEnhancementsIn: jest.fn(),
  transformEnhancementsOut: jest.fn(),
  bwc: {
    registerPersistableState: jest.fn(),
  }
});

export const createEmbeddableStartMock = (): jest.Mocked<EmbeddableStart> => ({
  getEmbeddableSchemas: jest.fn(),
  getTransforms: jest.fn(),
});
