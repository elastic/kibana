/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { flow } from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import type { DashboardSavedObjectAttributes } from '../../../../dashboard_saved_object';
import type { DashboardAttributes } from '../../types';

export function transformPanelsIn(
  panels: DashboardAttributes['panels']
): DashboardSavedObjectAttributes['panelsJSON'] {
  return flow(transformSetPanelIndex, transformPanelsProperties, JSON.stringify)(panels);
}

function transformSetPanelIndex(panels: DashboardAttributes['panels']) {
  const updatedPanels = panels.map(({ panelIndex, gridData, ...restPanel }) => {
    const idx = panelIndex ?? uuidv4();
    return {
      ...restPanel,
      panelIndex: idx,
      gridData: {
        ...gridData,
        i: idx,
      },
    };
  });
  return updatedPanels;
}

function transformPanelsProperties(panels: DashboardAttributes['panels']) {
  return panels.map(
    ({ panelConfig, gridData, id, panelIndex, panelRefName, title, type, version }) => ({
      gridData,
      id,
      embeddableConfig: panelConfig,
      panelIndex,
      panelRefName,
      title,
      type,
      version,
    })
  );
}
