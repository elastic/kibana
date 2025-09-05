/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PersistableState } from "@kbn/kibana-utils-plugin/common";
import { SerializableRecord } from "@kbn/utility-types";
import type { Reference } from '@kbn/content-management-utils';

export function getEnhancementsTransforms(getEnhancementStateManager: (enhancementId: string) => PersistableState | undefined) {
  return {
    transformIn: (enhancementsState: { [key: string]: unknown }) => {
      const transformedEnhancementsState: { [key: string]: unknown } = {};
      const enhancementsReferences: Reference[] = [];
      Object.keys(enhancementsState).forEach(key => {
        if (!enhancementsState[key]) return;
        const enhancementStateManger = getEnhancementStateManager(key);
        const { state, references } = enhancementStateManger
          ? enhancementStateManger.extract(enhancementsState[key] as SerializableRecord)
          : { state: enhancementsState[key], references: [] }
        transformedEnhancementsState[key] = state;
        enhancementsReferences.push(...references);
      });

      return { transformedEnhancementsState, enhancementsReferences }
    }
  }
}