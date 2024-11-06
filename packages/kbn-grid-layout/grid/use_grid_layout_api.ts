/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { cloneDeep } from 'lodash';

import { SerializableRecord } from '@kbn/utility-types';

import { GridLayoutApi, GridLayoutData, GridLayoutStateManager } from './types';
import { compactGridRow } from './utils/resolve_grid_row';
import { runPanelPlacementStrategy } from './utils/run_panel_placement';

export const useGridLayoutApi = ({
  gridLayoutStateManager,
}: {
  gridLayoutStateManager: GridLayoutStateManager;
}): GridLayoutApi => {
  const api: GridLayoutApi = useMemo(() => {
    return {
      addPanel: (panelId, placementSettings) => {
        const currentLayout = gridLayoutStateManager.gridLayout$.getValue();
        const [firstRow, ...rest] = currentLayout; // currently, only adding panels to the first row is supported
        const { columnCount: gridColumnCount } = gridLayoutStateManager.runtimeSettings$.getValue();
        const nextRow = runPanelPlacementStrategy(
          firstRow,
          {
            id: panelId,
            width: placementSettings.width,
            height: placementSettings.height,
          },
          gridColumnCount,
          placementSettings?.strategy
        );
        gridLayoutStateManager.gridLayout$.next([nextRow, ...rest]);
      },

      removePanel: (panelId) => {
        const currentLayout = gridLayoutStateManager.gridLayout$.getValue();

        // find the row where the panel exists and delete it from the corresponding panels object
        let rowIndex = 0;
        let updatedPanels;
        for (rowIndex; rowIndex < currentLayout.length; rowIndex++) {
          const row = currentLayout[rowIndex];
          if (Object.keys(row.panels).includes(panelId)) {
            updatedPanels = { ...row.panels }; // prevent mutation of original panel object
            delete updatedPanels[panelId];
            break;
          }
        }

        // if the panels were updated (i.e. the panel was successfully found and deleted), update the layout
        if (updatedPanels) {
          const newLayout = cloneDeep(currentLayout);
          newLayout[rowIndex] = compactGridRow({
            ...newLayout[rowIndex],
            panels: updatedPanels,
          });
          gridLayoutStateManager.gridLayout$.next(newLayout);
        }
      },

      replacePanel: (oldPanelId, newPanelId) => {
        const currentLayout = gridLayoutStateManager.gridLayout$.getValue();

        // find the row where the panel exists and update its ID to trigger a re-render
        let rowIndex = 0;
        let updatedPanels;
        for (rowIndex; rowIndex < currentLayout.length; rowIndex++) {
          const row = { ...currentLayout[rowIndex] };
          if (Object.keys(row.panels).includes(oldPanelId)) {
            updatedPanels = { ...row.panels }; // prevent mutation of original panel object
            const oldPanel = updatedPanels[oldPanelId];
            delete updatedPanels[oldPanelId];
            updatedPanels[newPanelId] = { ...oldPanel, id: newPanelId };
            break;
          }
        }

        // if the panels were updated (i.e. the panel was successfully found and replaced), update the layout
        if (updatedPanels) {
          const newLayout = cloneDeep(currentLayout);
          newLayout[rowIndex].panels = updatedPanels;
          gridLayoutStateManager.gridLayout$.next(newLayout);
        }
      },

      getPanelCount: () => {
        return gridLayoutStateManager.gridLayout$.getValue().reduce((prev, row) => {
          return prev + Object.keys(row.panels).length;
        }, 0);
      },

      serializeState: () => {
        const currentLayout = gridLayoutStateManager.gridLayout$.getValue();
        return cloneDeep(currentLayout) as GridLayoutData & SerializableRecord;
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return api;
};
