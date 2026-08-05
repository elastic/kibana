/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';
import { createEmbeddablePersistableStateServiceMock } from '../common/mocks';
import type { EmbeddableSetup, EmbeddableStart } from './plugin';
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

export function mockGetDrilldownsSchema(triggers: string[]) {
  return schema.object({
    drilldowns: schema.maybe(
      schema.arrayOf(
        schema.object({
          label: schema.string(),
          trigger: schema.oneOf(
            triggers.map((trigger) => schema.literal(trigger)) as [Type<string>]
          ),
          type: schema.string(),
        })
      )
    ),
  });
}
