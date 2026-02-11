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
import { transformEnhancementsOut } from '../bwc/enhancements/transform_enhancements_out';

export function getTransformDrilldownsOut(
  getTranformOut: (
    type: string
  ) => ((state: DrilldownState, references?: Reference[]) => DrilldownState) | undefined
) {
  function transformDrilldownsOut<StoredState extends DrilldownsState>(
    storedState: StoredState,
    references?: Reference[]
  ): StoredState {
    const { drilldowns, ...restOfState } = transformEnhancementsOut(storedState);
    return drilldowns?.length
      ? {
          ...(restOfState as StoredState),
          drilldowns: drilldowns.map((drilldownState) => {
            const transformOut = getTranformOut(drilldownState.type);
            return transformOut ? transformOut(drilldownState, references) : drilldownState;
          }),
        }
      : (restOfState as StoredState);
  }
  return transformDrilldownsOut;
}
