/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, combineLatest, debounceTime, map, retry } from 'rxjs';
import useResizeObserver, { type ObservedSize } from 'use-resize-observer/polyfilled';
import {
  ActivePanel,
  GridLayoutData,
  GridLayoutStateManager,
  GridSettings,
  PanelInteractionEvent,
  RuntimeGridSettings,
} from './types';

export const useGridLayoutState = ({
  getCreationOptions,
}: {
  getCreationOptions: () => { initialLayout: GridLayoutData; gridSettings: GridSettings };
}): {
  gridLayoutStateManager: GridLayoutStateManager;
  setDimensionsRef: (instance: HTMLDivElement | null) => void;
} => {
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const panelRefs = useRef<Array<{ [id: string]: HTMLDivElement | null }>>([]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { initialLayout, gridSettings } = useMemo(() => getCreationOptions(), []);

  const gridLayoutStateManager = useMemo(() => {
    const gridLayout$ = new BehaviorSubject<GridLayoutData>(initialLayout);
    const gridDimensions$ = new BehaviorSubject<ObservedSize>({ width: 0, height: 0 });
    const interactionEvent$ = new BehaviorSubject<PanelInteractionEvent | undefined>(undefined);
    const activePanel$ = new BehaviorSubject<ActivePanel | undefined>(undefined);
    const runtimeSettings$ = new BehaviorSubject<RuntimeGridSettings>({
      ...gridSettings,
      columnPixelWidth: 0,
    });

    return {
      rowRefs,
      panelRefs,
      gridLayout$,
      activePanel$,
      gridDimensions$,
      runtimeSettings$,
      interactionEvent$,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    /**
     * debounce width changes to avoid unnecessary column width recalculation.
     */
    const resizeSubscription = gridLayoutStateManager.gridDimensions$
      .pipe(debounceTime(250))
      .subscribe((dimensions) => {
        const elementWidth = dimensions.width ?? 0;
        const columnPixelWidth =
          (elementWidth - gridSettings.gutterSize * (gridSettings.columnCount - 1)) /
          gridSettings.columnCount;
        gridLayoutStateManager.runtimeSettings$.next({ ...gridSettings, columnPixelWidth });
      });

    /**
     * on layout change, update the styles of every panel so that it renders as expected
     */
    const onLayoutChangeSubscription = combineLatest([
      gridLayoutStateManager.gridLayout$,
      gridLayoutStateManager.activePanel$,
    ])
      .pipe(
        map(([gridLayout, activePanel]) => {
          // wait for all panel refs to be ready before continuing
          for (let rowIndex = 0; rowIndex < gridLayout.length; rowIndex++) {
            const currentRow = gridLayout[rowIndex];
            Object.keys(currentRow.panels).forEach((key) => {
              const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][key];
              if (!panelRef && !currentRow.isCollapsed) {
                throw new Error(
                  i18n.translate('kbnGridLayout.panelRefNotFoundError', {
                    defaultMessage: 'Panel reference does not exist', // the retry will catch this error
                  })
                );
              }
            });
          }
          return { gridLayout, activePanel };
        }),
        retry({ delay: 10 }) // retry until panel references all exist
      )
      .subscribe(({ gridLayout, activePanel }) => {
        const runtimeSettings = gridLayoutStateManager.runtimeSettings$.getValue();
        const currentInteractionEvent = gridLayoutStateManager.interactionEvent$.getValue();

        for (let rowIndex = 0; rowIndex < gridLayout.length; rowIndex++) {
          if (activePanel && rowIndex !== currentInteractionEvent?.targetRowIndex) {
            /**
             * If there is an interaction event happening but the current row is not being targetted, it
             * does not need to be re-rendered; so, skip setting the panel styles of this row.
             *
             * If there is **no** interaction event, then this is the initial render so the styles of every
             * panel should be initialized; so, don't skip setting the panel styles.
             */
            continue;
          }

          // re-render the targetted row
          const currentRow = gridLayout[rowIndex];
          Object.keys(currentRow.panels).forEach((key) => {
            const panel = currentRow.panels[key];
            const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][key];
            if (!panelRef) {
              return;
            }

            const isResize = currentInteractionEvent?.type === 'resize';
            if (panel.id === activePanel?.id) {
              // if the current panel is active, give it fixed positioning depending on the interaction event
              const { position: draggingPosition } = activePanel;

              if (isResize) {
                // if the current panel is being resized, ensure it is not shrunk past the size of a single cell
                panelRef.style.width = `${Math.max(
                  draggingPosition.right - draggingPosition.left,
                  runtimeSettings.columnPixelWidth
                )}px`;
                panelRef.style.height = `${Math.max(
                  draggingPosition.bottom - draggingPosition.top,
                  runtimeSettings.rowHeight
                )}px`;

                // undo any "lock to grid" styles **except** for the top left corner, which stays locked
                panelRef.style.gridColumnStart = `${panel.column + 1}`;
                panelRef.style.gridRowStart = `${panel.row + 1}`;
                panelRef.style.gridColumnEnd = ``;
                panelRef.style.gridRowEnd = ``;
              } else {
                // if the current panel is being dragged, render it with a fixed position + size
                panelRef.style.position = 'fixed';
                panelRef.style.left = `${draggingPosition.left}px`;
                panelRef.style.top = `${draggingPosition.top}px`;
                panelRef.style.width = `${draggingPosition.right - draggingPosition.left}px`;
                panelRef.style.height = `${draggingPosition.bottom - draggingPosition.top}px`;

                // undo any "lock to grid" styles
                panelRef.style.gridColumnStart = ``;
                panelRef.style.gridRowStart = ``;
                panelRef.style.gridColumnEnd = ``;
                panelRef.style.gridRowEnd = ``;
              }
            } else {
              // if the panel is not being dragged and/or resized, undo any fixed position styles
              panelRef.style.position = '';
              panelRef.style.left = ``;
              panelRef.style.top = ``;
              panelRef.style.width = ``;
              panelRef.style.height = ``;

              // and render the panel locked to the grid
              panelRef.style.gridColumnStart = `${panel.column + 1}`;
              panelRef.style.gridColumnEnd = `${panel.column + 1 + panel.width}`;
              panelRef.style.gridRowStart = `${panel.row + 1}`;
              panelRef.style.gridRowEnd = `${panel.row + 1 + panel.height}`;
            }
          });
        }
      });

    return () => {
      resizeSubscription.unsubscribe();
      onLayoutChangeSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { ref: setDimensionsRef } = useResizeObserver<HTMLDivElement>({
    onResize: (dimensions) => {
      gridLayoutStateManager.gridDimensions$.next(dimensions);
    },
  });

  return { gridLayoutStateManager, setDimensionsRef };
};
