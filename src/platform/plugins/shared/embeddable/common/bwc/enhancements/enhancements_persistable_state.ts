/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';
import type { Reference } from '@kbn/content-management-utils';
import { dynamicActionsPersistableState } from './dynamic_actions/dynamic_action_enhancement';
import type { DynamicActionsState } from './dynamic_actions/types';

export const enhancementsPersistableState = {
  extract: (enhancementsState: SerializableRecord) => {
    if (!enhancementsState?.dynamicActions) {
      return { state: enhancementsState, references: [] };
    }

    const { state: dynamicAtionsState, references } = dynamicActionsPersistableState.extract(
      enhancementsState.dynamicActions as DynamicActionsState
    );
    return {
      state: {
        dynamicActions: dynamicAtionsState,
      },
      references,
    };
  },
  inject: (enhancementsState: SerializableRecord, references: Reference[]) => {
    return enhancementsState?.dynamicActions
      ? {
          dynamicActions: dynamicActionsPersistableState.inject(
            enhancementsState.dynamicActions as DynamicActionsState,
            references
          ),
        }
      : enhancementsState;
  },
  telemetry(enhancementsState: SerializableRecord, telemetryData: Record<string, any> = {}) {
    return enhancementsState?.dynamicActions
      ? dynamicActionsPersistableState.telemetry(
          enhancementsState.dynamicActions as DynamicActionsState,
          telemetryData
        )
      : telemetryData;
  },
};
