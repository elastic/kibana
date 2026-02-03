/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownsState, DrilldownState } from '../../server';

export function getTransformDrilldownsIn(
  getTranformIn: (type: string) =>
    | ((state: DrilldownState) => {
        state: DrilldownState;
        references?: Reference[];
      })
    | undefined
) {
  function transformDrilldownsIn<State extends DrilldownsState>(state: State) {
    const { drilldowns, ...restOfState } = state;
    if (!drilldowns) {
      return {
        state: state as State,
        references: [],
      };
    }

    const references: Reference[] = [];
    return {
      state: {
        ...(restOfState as State),
        drilldowns: drilldowns.map((drilldownState) => {
          const transformIn = getTranformIn(drilldownState.type);
          if (!transformIn) {
            return drilldownState;
          }

          const { state: storedDrilldownState, references: drilldownReferences } =
            transformIn(drilldownState);
          if (drilldownReferences) {
            references.push(...drilldownReferences);
          }
          return storedDrilldownState;
        }),
      },
      references,
    };
  }
  return transformDrilldownsIn;
}
