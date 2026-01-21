/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownState } from '../../server';

export function getTransformDrilldownsIn(
  getTranformIn: (type: string) => (state: {}) => {
    state: {};
    references?: Reference[];
  }
) {
  function transformDrilldownsIn(drilldowns: DrilldownState[]) {
    const references: Reference[] = [];
    return {
      state: drilldowns.map((drilldownState) => {
        const transformIn = getTranformIn(drilldownState.config.type);
        if (!transformIn) {
          return drilldownState;
        }

        const { state: drilldownConfig, references: drilldownReferences } = transformIn(
          drilldownState.config
        );
        if (drilldownReferences) {
          references.push(...drilldownReferences);
        }
        return {
          ...drilldownState,
          config: drilldownConfig,
        };
      }),
      references,
    };
  }
  return transformDrilldownsIn;
}
