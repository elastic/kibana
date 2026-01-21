/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmbeddablePersistableStateServiceMock } from '../common/mocks';
import type { EmbeddableSetup, EmbeddableStart } from './plugin';

export const createEmbeddableSetupMock = (): jest.Mocked<EmbeddableSetup> => ({
  ...createEmbeddablePersistableStateServiceMock(),
  registerEmbeddableFactory: jest.fn(),
  registerTransforms: jest.fn(),
  getAllMigrations: jest.fn().mockReturnValue({}),
  transformEnhancementsIn: jest.fn(),
  transformEnhancementsOut: jest.fn(),
});

export const createEmbeddableStartMock = (): jest.Mocked<EmbeddableStart> => ({
  ...createEmbeddablePersistableStateServiceMock(),
  getEmbeddableSchemas: jest.fn(),
  getTransforms: jest.fn(),
});
