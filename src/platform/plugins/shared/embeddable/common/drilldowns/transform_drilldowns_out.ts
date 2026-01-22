/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import type { DrilldownsState } from '../../server';
import { transformEnhancementsOut } from '../bwc/enhancements/transform_enhancements_out';

export function getTransformDrilldownsOut(
  getTranformOut: (
    type: string
  ) => ((state: { type: string }, references?: Reference[]) => { type: string }) | undefined
) {
  function transformDrilldownsOut(state: DrilldownsState, references?: Reference[]) {
    const { drilldowns, ...restOfState } = transformEnhancementsOut(state);
    return drilldowns?.length
      ? {
          ...restOfState,
          drilldowns: drilldowns.map((drilldownState) => {
            const transformOut = getTranformOut(drilldownState.config.type);
            return transformOut
              ? {
                  ...drilldownState,
                  config: transformOut(drilldownState.config, references),
                }
              : drilldownState;
          }),
        }
      : restOfState;
  }
  return transformDrilldownsOut;
}
