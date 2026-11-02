/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Reference } from '@kbn/content-management-utils';
import {
  ON_APPLY_FILTER,
  ON_CLICK_IMAGE,
  ON_CLICK_ROW,
  ON_CLICK_VALUE,
  ON_OPEN_PANEL_MENU,
  ON_SELECT_RANGE,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { SerializedDrilldowns, DrilldownState } from '../../server';
import { transformEnhancementsOut } from '../bwc/enhancements/transform_enhancements_out';

export function getTransformDrilldownsOut(
  getTranformOut: (
    type: string
  ) => ((state: DrilldownState, references?: Reference[]) => DrilldownState) | undefined
) {
  function transformDrilldownsOut<StoredState extends SerializedDrilldowns>(
    storedState: StoredState,
    references?: Reference[]
  ): StoredState {
    const { drilldowns, ...restOfState } = transformEnhancementsOut(storedState);
    return drilldowns?.length
      ? {
          ...(restOfState as StoredState),
          drilldowns: drilldowns.map((drilldownState) => {
            const transformOut = getTranformOut(drilldownState.type);
            const transformedDrilldownState = transformOut
              ? transformOut(drilldownState, references)
              : drilldownState;
            return {
              ...transformedDrilldownState,
              trigger: TRIGGER_ID_MIGRATIONS[drilldownState.trigger] ?? drilldownState.trigger,
            };
          }),
        }
      : (restOfState as StoredState);
  }
  return transformDrilldownsOut;
}

// Drilldowns used different Trigger Ids before 9.4.0
const TRIGGER_ID_MIGRATIONS: { [key: string]: string } = {
  VALUE_CLICK_TRIGGER: ON_CLICK_VALUE,
  IMAGE_CLICK_TRIGGER: ON_CLICK_IMAGE,
  ROW_CLICK_TRIGGER: ON_CLICK_ROW,
  SELECT_RANGE_TRIGGER: ON_SELECT_RANGE,
  FILTER_TRIGGER: ON_APPLY_FILTER,
  CONTEXT_MENU_TRIGGER: ON_OPEN_PANEL_MENU,
};
