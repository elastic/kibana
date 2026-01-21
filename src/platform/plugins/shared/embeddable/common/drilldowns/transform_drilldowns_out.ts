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
import type { DynamicActionsState } from '../bwc/enhancements/dynamic_actions/types';
import { convertToDrilldowns } from '../bwc/enhancements/convert_to_drilldowns';

export function getTransformDrilldownsOut(
  getTranformOut: (
    type: string
  ) => ((state: { type: string }, references?: Reference[]) => { type: string }) | undefined
) {
  function transformDrilldownsOut(
    state: {
      drilldowns?: DrilldownState[];
      enhancements?: { dynamicActions?: DynamicActionsState };
    },
    references?: Reference[]
  ) {
    return state.enhancements || state.drilldowns
      ? {
          drilldowns: [...convertToDrilldowns(state.enhancements ?? {}), ...(state.drilldowns ?? [])].map(
            (drilldownState) => {
              const transformOut = getTranformOut(drilldownState.config.type);
              return transformOut
                ? {
                    ...drilldownState,
                    config: transformOut(drilldownState.config, references),
                  }
                : drilldownState;
            })
        }
      : {};
  }
  return transformDrilldownsOut;
}
