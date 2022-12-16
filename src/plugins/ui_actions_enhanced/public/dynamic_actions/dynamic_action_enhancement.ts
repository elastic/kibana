/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { EnhancementRegistryDefinition } from '@kbn/embeddable-plugin/public';
import { SavedObjectReference } from '@kbn/core/types';
import { DynamicActionsState } from '..';
import { UiActionsServiceEnhancements } from '../services';

export const dynamicActionEnhancement = (
  uiActionsEnhanced: UiActionsServiceEnhancements
): EnhancementRegistryDefinition => {
  return {
    id: 'dynamicActions',
    telemetry: (
      state: SerializableRecord,
      telemetryData: Record<string, string | number | boolean>
    ) => {
      return uiActionsEnhanced.telemetry(state as DynamicActionsState, telemetryData);
    },
    extract: (state: SerializableRecord) => {
      return uiActionsEnhanced.extract(state as DynamicActionsState);
    },
    inject: (state: SerializableRecord, references: SavedObjectReference[]) => {
      return uiActionsEnhanced.inject(state as DynamicActionsState, references);
    },
  } as EnhancementRegistryDefinition<SerializableRecord>;
};
