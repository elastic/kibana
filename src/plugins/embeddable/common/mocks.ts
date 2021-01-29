/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EmbeddablePersistableStateService } from './types';

export const createEmbeddablePersistableStateServiceMock = (): jest.Mocked<EmbeddablePersistableStateService> => {
  return {
    inject: jest.fn((state, references) => state),
    extract: jest.fn((state) => ({ state, references: [] })),
    migrate: jest.fn((state, version) => state),
    telemetry: jest.fn((state, collector) => ({})),
  };
};
