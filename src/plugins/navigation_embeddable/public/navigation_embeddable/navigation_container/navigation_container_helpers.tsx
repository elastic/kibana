/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LinkPanels } from '../types';

/** TODO: This is copied from the control group; maybe make it generic and extract it so we aren't duplicating this code */
export const getNextPanelOrder = (panels?: LinkPanels) => {
  let nextOrder = 0;
  if (Object.keys(panels ?? {}).length > 0) {
    nextOrder =
      Object.values(panels ?? {}).reduce((highestSoFar, panel) => {
        if (panel.order > highestSoFar) highestSoFar = panel.order;
        return highestSoFar;
      }, 0) + 1;
  }
  return nextOrder;
};
