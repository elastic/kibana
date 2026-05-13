/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { createEmbeddablePersistableStateServiceMock } from '../common/mocks';
import type { EmbeddableSetup, EmbeddableStart } from './plugin';
import type { GetDrilldownsSchemaFnType } from './drilldowns/types';
import { getDrilldownRegistry } from './drilldowns/registry';

export const createEmbeddableSetupMock = (): jest.Mocked<EmbeddableSetup> => ({
  ...createEmbeddablePersistableStateServiceMock(),
  registerDrilldown: jest.fn(),
  registerEmbeddableFactory: jest.fn(),
  registerEmbeddableServerDefinition: jest.fn(),
  getAllMigrations: jest.fn().mockReturnValue({}),
});

export const createEmbeddableStartMock = (): jest.Mocked<EmbeddableStart> => ({
  ...createEmbeddablePersistableStateServiceMock(),
  getAllEmbeddableSchemas: jest.fn(),
  getTransforms: jest.fn(),
});

export const mockGetDrilldownsSchema: GetDrilldownsSchemaFnType = (supportedTriggers) => {
  const registry = getDrilldownRegistry();
  registry.registerDrilldown('test-drilldown', {
    schema: z.object({
      foo: z.string().optional(),
    }),
    supportedTriggers,
  });

  return registry.getSchema(supportedTriggers);
};
