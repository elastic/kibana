/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Vis } from '@kbn/visualizations-plugin/public';
import { TimeRange } from '@kbn/data-plugin/common';
import type { Panel } from '../../common/types';
import { PANEL_TYPES } from '../../common/enums';
import { ConvertTsvbToLensVisualization } from './types';

const getConvertFnByType = (type: PANEL_TYPES) => {
  const convertionFns: { [key in PANEL_TYPES]?: () => Promise<ConvertTsvbToLensVisualization> } = {
    [PANEL_TYPES.TIMESERIES]: async () => {
      const { convertToLens } = await import('./timeseries');
      return convertToLens;
    },
    [PANEL_TYPES.TOP_N]: async () => {
      const { convertToLens } = await import('./top_n');
      return convertToLens;
    },
    [PANEL_TYPES.METRIC]: async () => {
      const { convertToLens } = await import('./metric');
      return convertToLens;
    },
    [PANEL_TYPES.GAUGE]: async () => {
      const { convertToLens } = await import('./gauge');
      return convertToLens;
    },
    [PANEL_TYPES.TABLE]: async () => {
      const { convertToLens } = await import('./table');
      return convertToLens;
    },
  };

  return convertionFns[type]?.();
};

/*
 * This function is used to convert the TSVB model to compatible Lens model.
 * Returns the Lens model, only if it is supported. If not, it returns null.
 * In case of null, the menu item is disabled and the user can't navigate to Lens.
 */
export const convertTSVBtoLensConfiguration = async (vis: Vis<Panel>, timeRange?: TimeRange) => {
  // Disables if model is invalid
  if (vis.params.isModelInvalid) {
    return null;
  }

  const convertFn = await getConvertFnByType(vis.params.type);

  return (await convertFn?.(vis, timeRange)) ?? null;
};
