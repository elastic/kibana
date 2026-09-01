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
import type { EmbeddableServerDefinition } from './embeddable_transforms/types';

const mockEmbeddableServerDefinitionRegistry: {
  [type: string]: EmbeddableServerDefinition<any, any>;
} = {};

export const createEmbeddableSetupMock = (): jest.Mocked<EmbeddableSetup> => {
  return {
    ...createEmbeddablePersistableStateServiceMock(),
    registerDrilldown: jest.fn(),
    registerEmbeddableFactory: jest.fn(),
    registerEmbeddableServerDefinition: jest
      .fn()
      .mockImplementation((type: string, transforms: EmbeddableServerDefinition<any, any>) => {
        mockEmbeddableServerDefinitionRegistry[type] = transforms;
      }),
    getAllMigrations: jest.fn().mockReturnValue({}),
  };
};

export const createEmbeddableStartMock = (): jest.Mocked<EmbeddableStart> => ({
  ...createEmbeddablePersistableStateServiceMock(),
  getAllEmbeddableSchemas: jest.fn().mockReturnValue(
    Object.entries(mockEmbeddableServerDefinitionRegistry).map(([type, definition]) => ({
      type,
      schema: definition.getSchema?.(mockGetDrilldownsSchema),
    }))
  ),
  getTransforms: jest.fn().mockImplementation((type) => {
    const registration = mockEmbeddableServerDefinitionRegistry[type];
    const transforms = registration?.getTransforms?.({
      transformIn: jest.fn(),
      transformOut: jest.fn(),
    });
    return { ...transforms, schema: registration?.getSchema?.(mockGetDrilldownsSchema) };
  }),
});

export const mockGetDrilldownsSchema: GetDrilldownsSchemaFnType = (supportedTriggers) => {
  const registry = getDrilldownRegistry();
  registry.registerDrilldown('test-drilldown', {
    schema: z
      .object({
        foo: z.string().optional(),
      })
      .strict(),
    supportedTriggers,
  });

  return registry.getSchema(supportedTriggers);
};
