/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { EnhancementRegistryDefinition } from '@kbn/embeddable-plugin/server';
import type { SavedObjectReference } from '@kbn/core/types';
import type { ActionFactory, DynamicActionsState, SerializedEvent } from './types';

export const dynamicActionEnhancement = (
  getActionFactory: (id: string) => undefined | ActionFactory
): EnhancementRegistryDefinition => {
  return {
    id: 'dynamicActions',
    extract: (state: SerializableRecord) => {
      const references: SavedObjectReference[] = [];
      const newState: DynamicActionsState = {
        events: (state as DynamicActionsState).events.map((event: SerializedEvent) => {
          const factory = getActionFactory(event.action.factoryId);
          const result = factory
            ? factory.extract(event)
            : {
                state: event,
                references: [],
              };
          result.references.forEach((r) => references.push(r));
          return result.state;
        }),
      };
      return { state: newState, references };
    },
    inject: (state: SerializableRecord, references: SavedObjectReference[]) => {
      return {
        events: (state as DynamicActionsState).events.map((event: SerializedEvent) => {
          const factory = getActionFactory(event.action.factoryId);
          return factory ? factory.inject(event, references) : event;
        }),
      } as DynamicActionsState;
    },
  } as EnhancementRegistryDefinition;
};
