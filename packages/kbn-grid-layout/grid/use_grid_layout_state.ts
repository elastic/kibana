/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { createRef, useEffect, useMemo, useRef } from 'react';
import { BehaviorSubject, combineLatest, debounceTime, map, of, retry, skip, tap } from 'rxjs';

import { transparentize } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import useResizeObserver, { type ObservedSize } from 'use-resize-observer/polyfilled';

import {
  ActivePanel,
  GridLayoutData,
  GridLayoutStateManager,
  GridPanelData,
  GridRowData,
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
    const rowCount$ = new BehaviorSubject<number>(initialLayout.length);
    const rows$ = initialLayout.reduce((prev, currentRow) => {
      return [
        ...prev,
        new BehaviorSubject<Omit<GridRowData, 'panels'> & { panelIds: string[] }>({
          title: currentRow.title,
          isCollapsed: currentRow.isCollapsed,
          panelIds: Object.keys(currentRow.panels),
        }),
      ];
    }, [] as Array<BehaviorSubject<Omit<GridRowData, 'panels'> & { panelIds: string[] }>>);
    const gridLayout$ = new BehaviorSubject<GridLayoutData>(initialLayout);
    const gridDimensions$ = new BehaviorSubject<ObservedSize>({ width: 0, height: 0 });
    const interactionEvent$ = new BehaviorSubject<PanelInteractionEvent | undefined>(undefined);
    const activePanel$ = new BehaviorSubject<ActivePanel | undefined>(undefined);
    const runtimeSettings$ = new BehaviorSubject<RuntimeGridSettings>({
      ...gridSettings,
      columnPixelWidth: 0,
    });
    const targetRow$ = new BehaviorSubject<number | undefined>(undefined);
    const panelIds$ = new BehaviorSubject<string[][]>(
      initialLayout.map(({ panels }) => Object.keys(panels))
    );
    const dragPreviewRefs = initialLayout.map((row) => createRef<HTMLDivElement>());

    return {
      rowRefs,
      rows$,
      panelRefs,
      dragPreviewRefs,
      rowCount$,
      targetRow$,
      panelIds$,
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
    const updatePanelStylesSubscription = combineLatest([
      gridLayoutStateManager.gridLayout$.pipe(
        map((gridLayout) => {
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
          return gridLayout;
        }),
        retry({ delay: 1 }) // retry until panel references all exist
      ),
      gridLayoutStateManager.runtimeSettings$.pipe(skip(1)),
      gridLayoutStateManager.activePanel$,
      gridLayoutStateManager.targetRow$,
    ])
      .pipe(skip(1))
      .subscribe(([gridLayout, runtimeSettings, activePanel, targetRow]) => {
        const currentInteractionEvent = gridLayoutStateManager.interactionEvent$.getValue();

        for (let rowIndex = 0; rowIndex < gridLayout.length; rowIndex++) {
          const rowRef = gridLayoutStateManager.rowRefs.current[rowIndex];
          if (!rowRef) return;

          // set the CSS grid + styles of the current row
          const currentRow = gridLayout[rowIndex];
          setRowStyles({ rowRef, runtimeSettings, currentRow, targetRow, rowIndex });

          if (activePanel && rowIndex !== targetRow) {
            /**
             * If there is an activePanel happening but the current row is not being targetted, it
             * does not need to be re-rendered; so, skip setting the panel styles of this row.
             */
            continue;
          }

          // set the styles for every panel in the row
          Object.keys(currentRow.panels).forEach((key) => {
            const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][key];
            if (!panelRef) {
              return;
            }

            const panel = currentRow.panels[key];
            setPanelStyles({
              panelRef,
              panel,
              dragPreviewRef: gridLayoutStateManager.dragPreviewRefs[rowIndex].current,
              runtimeSettings,
              activePanel,
              isResize: currentInteractionEvent?.type === 'resize',
            });
          });
        }
      });

    return () => {
      resizeSubscription.unsubscribe();
      updatePanelStylesSubscription.unsubscribe();
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

const setRowStyles = ({
  rowRef,
  runtimeSettings,
  currentRow,
  rowIndex,
  targetRow,
}: {
  rowRef: HTMLDivElement;
  runtimeSettings: RuntimeGridSettings;
  currentRow: GridRowData;
  rowIndex: number;
  targetRow?: number;
}) => {
  const { gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;
  const maxRow = Object.values(currentRow.panels).reduce((acc, panel) => {
    return Math.max(acc, panel.row + panel.height);
  }, 0);
  const rowCount = maxRow || 1;

  rowRef.style.gridTemplateRows = `repeat(${rowCount}, ${rowHeight}px)`;

  if (rowIndex === targetRow) {
    // apply "targetted row" styles
    const gridColor = transparentize(euiThemeVars.euiColorSuccess, 0.2);

    rowRef.style.backgroundPosition = `top -${gutterSize / 2}px left -${gutterSize / 2}px`;
    rowRef.style.backgroundSize = ` ${columnPixelWidth + gutterSize}px ${rowHeight + gutterSize}px`;
    rowRef.style.backgroundImage = `linear-gradient(to right, ${gridColor} 1px, transparent 1px),
  linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`;
    rowRef.style.backgroundColor = `${transparentize(euiThemeVars.euiColorSuccess, 0.05)}`;
  } else {
    // undo any "targetted row" styles
    rowRef.style.backgroundPosition = ``;
    rowRef.style.backgroundSize = ``;
    rowRef.style.backgroundImage = ``;
    rowRef.style.backgroundColor = `transparent`;
  }
};

const setPanelStyles = ({
  panelRef,
  dragPreviewRef,
  panel,
  runtimeSettings,
  activePanel,
  isResize,
}: {
  panelRef: HTMLDivElement;
  dragPreviewRef: HTMLDivElement | null;
  panel: GridPanelData;
  runtimeSettings: RuntimeGridSettings;
  activePanel?: ActivePanel;
  isResize: boolean;
}) => {
  if (panel.id === activePanel?.id) {
    // if the current panel is active, give it fixed positioning depending on the interaction event
    const { position: draggingPosition } = activePanel;

    panelRef.style.zIndex = `${euiThemeVars.euiZModal}`;
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

    // update the drag preview
    if (dragPreviewRef) {
      dragPreviewRef.style.display = 'block';
      dragPreviewRef.style.gridColumnStart = `${panel.column + 1}`;
      dragPreviewRef.style.gridColumnEnd = `${panel.column + 1 + panel.width}`;
      dragPreviewRef.style.gridRowStart = `${panel.row + 1}`;
      dragPreviewRef.style.gridRowEnd = `${panel.row + 1 + panel.height}`;
    }
  } else {
    panelRef.style.zIndex = '0';

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

    // update the drag preview
    if (dragPreviewRef) {
      dragPreviewRef.style.display = 'none';
    }
  }
};
