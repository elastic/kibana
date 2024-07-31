/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiPortal, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import {
  hideDragPreviewRect,
  updateDragPreviewRect,
  useRuntimeGridSettings,
} from './grid_layout_utils';
import { KibanaGridRow } from './grid_row';
import { interactionEventToPixelRect } from './interaction_event_to_pixel_rect';
import { GridLayout, GridSettings, PanelInteractionEvent } from './types';

/**
 * mouse position
 * offset
 * drag vs resize event type
 *
 * requested posistion (x, y, width, height) in pixels
 *   Set preview panel to this position
 * Calculate which grid the preview is over (if drag - if resize, use the targeted grid)
 * requested grid position (row, column, width, height) in grid units + target grid row
 * when requested grid position changes
 *   resolve grid + set grid layout to resolved grid
 */

// const updateInteractionData = useCallback(
//   (nextInteractionData?: InteractionData) => {
//     // if (isGridDataEqual(nextInteractionData?.panelData, lastInteractionData.current?.panelData)) {
//     //   return;
//     // }
//     setGridLayout((currentRows) => {
//       const interactingId = nextInteractionData?.panelData?.id;
//       if (!nextInteractionData || !interactingId) return currentRows;

//       // remove the panel from the row it's currently in.
//       let originalRow: number | undefined;
//       const nextRows = currentRows.map((row, rowIndex) => {
//         const { [interactingId]: interactingPanel, ...rest } = row;
//         if (interactingPanel) originalRow = rowIndex;
//         return { ...rest };
//       });

//       // resolve destination grid
//       const destinationGrid = nextRows[nextInteractionData.targetedRow];
//       const resolvedDestinationGrid = resolveGrid(destinationGrid, {
//         ...nextInteractionData?.panelData,
//       });
//       nextRows[nextInteractionData.targetedRow] = resolvedDestinationGrid;

//       // resolve origin grid
//       if (originalRow && originalRow !== nextInteractionData.targetedRow) {
//         const originGrid = nextRows[originalRow];
//         const resolvedOriginGrid = resolveGrid(originGrid);
//         nextRows[originalRow] = resolvedOriginGrid;
//       }

//       return nextRows;
//     });
//     setInteractionData(nextInteractionData);
//   },
//   [setGridLayout]
// );

export const KibanaGridLayout = ({
  getCreationOptions,
}: {
  getCreationOptions: () => { initialLayout: GridLayout; gridSettings: GridSettings };
}) => {
  const dragEnterCount = useRef(0);
  const rows = useRef<Array<HTMLDivElement | null>>([]);
  const dragPreview = useRef<HTMLDivElement | null>(null);
  const interactionEvent = useRef<PanelInteractionEvent | null>(null);

  const [activePanelId, setActivePanelId] = useState<string | undefined>();
  const [targetedGridIndex, setTargetedGridIndex] = useState<number | undefined>();

  const setInteractionEvent = useCallback((nextInteraction?: PanelInteractionEvent) => {
    interactionEvent.current = nextInteraction ?? null;
    setTargetedGridIndex(nextInteraction?.originRowIndex);
    setActivePanelId(nextInteraction?.id);
    if (!nextInteraction) hideDragPreviewRect(dragPreview.current);
  }, []);

  const { grid$: gridLayout$, settings: gridSettings } = useMemo(
    () => {
      const { initialLayout, gridSettings: settings } = getCreationOptions();
      const grid$ = new BehaviorSubject<GridLayout>(initialLayout);
      return { grid$, settings };
    },
    // disabling exhaustive deps because the grid settings are not meant to change at runtime
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const { runtimeSettings$, gridSizeRef } = useRuntimeGridSettings({ gridSettings });

  // -----------------------------------------------------------------------------------------
  // Set up drag events
  // -----------------------------------------------------------------------------------------
  useEffect(() => {
    const dragOver = (e: MouseEvent) => {
      if (!runtimeSettings$.value || !interactionEvent.current) return;
      e.preventDefault();
      e.stopPropagation();
      const mouseTargetPixel = { x: e.clientX, y: e.clientY };

      const pixelRect = interactionEventToPixelRect({
        gridLayout: gridLayout$.value,
        mousePoint: mouseTargetPixel,
        rows: rows.current,
        runtimeSettings: runtimeSettings$.value,
        interactionEvent: interactionEvent.current,
      });

      updateDragPreviewRect({ pixelRect, dragPreview: dragPreview.current });
    };

    const onDrop = (e: MouseEvent) => {
      if (!interactionEvent.current) return;
      e.preventDefault();
      e.stopPropagation();

      setInteractionEvent();
      dragEnterCount.current = 0;
    };

    const onDragEnter = (e: MouseEvent) => {
      if (!interactionEvent.current) return;
      e.preventDefault();
      e.stopPropagation();

      dragEnterCount.current++;
    };

    const onDragLeave = (e: MouseEvent) => {
      if (!interactionEvent.current) return;
      e.preventDefault();
      e.stopPropagation();

      dragEnterCount.current--;
      if (dragEnterCount.current === 0) {
        setInteractionEvent();
        dragEnterCount.current = 0;
      }
    };

    window.addEventListener('drop', onDrop);
    window.addEventListener('dragover', dragOver);
    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragleave', onDragLeave);
    return () => {
      window.removeEventListener('drop', dragOver);
      window.removeEventListener('dragover', dragOver);
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragleave', onDragLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [gridLayout, runtimeSettings] = useBatchedPublishingSubjects(gridLayout$, runtimeSettings$);

  return (
    <div ref={gridSizeRef}>
      {gridLayout.map((gridRow, rowIndex) => {
        return (
          <KibanaGridRow
            key={rowIndex}
            gridRow={gridRow}
            rowIndex={rowIndex}
            activePanelId={activePanelId}
            runtimeSettings={runtimeSettings}
            targetedGridIndex={targetedGridIndex}
            setInteractionEvent={setInteractionEvent}
            ref={(element) => (rows.current[rowIndex] = element)}
          />
        );
      })}
      <EuiPortal>
        <div
          ref={dragPreview}
          css={css`
            pointer-events: none;
            border-radius: ${euiThemeVars.euiBorderRadius};
            background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.2)};
            transition: opacity 100ms linear;
            position: absolute;
          `}
        />
      </EuiPortal>
    </div>
  );
};
