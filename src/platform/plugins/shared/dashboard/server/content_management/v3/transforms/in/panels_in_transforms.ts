/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';

import { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import { DashboardAttributes } from '../../types';

export function transformPanelsIn(
  panels: DashboardAttributes['panels']
): DashboardSavedObjectAttributes['panelsJSON'] {
  const updatedPanels = panels.map(({ panelIndex, gridData, panelConfig, ...restPanel }) => {
    const idx = panelIndex ?? uuidv4();
    return {
      ...restPanel,
      embeddableConfig: panelConfig,
      panelIndex: idx,
      gridData: {
        ...gridData,
        i: idx,
      },
    };
  });

  return JSON.stringify(updatedPanels);
}
