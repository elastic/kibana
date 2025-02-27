/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import { cloneDeep } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { combineLatest, map, pairwise, skip } from 'rxjs';

import { css } from '@emotion/react';

import { DragPreview } from '../drag_preview';
import { GridPanel } from '../grid_panel';
import { useGridLayoutContext } from '../use_grid_layout_context';
import { getKeysInOrder } from '../utils/resolve_grid_row';
import { deleteRow } from '../utils/row_management';
import { DeleteGridRowModal } from './delete_grid_row_modal';
import { GridRowFooter } from './grid_row_footer';
import { GridRowHeader } from './grid_row_header';

export interface GridRowProps {
  rowIndex: number;
}

export const GridRow = React.memo(({ rowIndex }: GridRowProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const collapseButtonRef = useRef<HTMLButtonElement | null>(null);
  const currentRow = gridLayoutStateManager.gridLayout$.value[rowIndex];

  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);

  const [panelIdsInOrder, setPanelIdsInOrder] = useState<string[]>(() =>
    getKeysInOrder(currentRow.panels)
  );

  const [activeSectionIndex, setActiveSection] = useState<number | undefined>(
    gridLayoutStateManager.activeSection$.getValue()
  );
  const [isCollapsed, setIsCollapsed] = useState<boolean>(currentRow.isCollapsed);

  useEffect(
    () => {
      /** Update the styles of the grid row via a subscription to prevent re-renders */
      const interactionStyleSubscription = gridLayoutStateManager.interactionEvent$
        .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
        .subscribe((interactionEvent) => {
          const rowRef = gridLayoutStateManager.rowRefs.current[rowIndex];
          if (!rowRef) return;
          const targetRow = interactionEvent?.targetRowIndex;
          if (rowIndex === targetRow && interactionEvent) {
            rowRef.classList.add('kbnGridRow--targeted');
          } else {
            rowRef.classList.remove('kbnGridRow--targeted');
          }
        });

      const sectionSubscription = combineLatest([
        gridLayoutStateManager.gridLayout$,
        gridLayoutStateManager.activeSection$,
      ]).subscribe(([gridLayout, activeSection]) => {
        const newActiveSection =
          activeSection !== undefined ? Math.min(activeSection, gridLayout.length - 1) : undefined;
        setActiveSection(newActiveSection);
        if (activeSection !== newActiveSection)
          gridLayoutStateManager.activeSection$.next(newActiveSection);
        setIsCollapsed(gridLayout[rowIndex]?.isCollapsed ?? false);
      });

      /**
       * Ensure the row re-renders to reflect the new panel order after a drag-and-drop interaction, since
       * the order of rendered panels need to be aligned with how they are displayed in the grid for accessibility
       * reasons (screen readers and focus management).
       */
      const gridLayoutSubscription = gridLayoutStateManager.gridLayout$
        .pipe(
          pairwise(),
          map(([layoutBefore, layoutAfter]) => {
            if (!layoutBefore[rowIndex] || !layoutAfter[rowIndex]) return;
            return {
              oldKeysInOrder: getKeysInOrder(layoutBefore[rowIndex].panels),
              newKeysInOrder: getKeysInOrder(layoutAfter[rowIndex].panels),
            };
          })
        )
        .subscribe((result) => {
          if (!result) return;
          const { oldKeysInOrder, newKeysInOrder } = result;
          if (oldKeysInOrder.join() !== newKeysInOrder.join()) {
            setPanelIdsInOrder(newKeysInOrder);
          }
        });

      return () => {
        interactionStyleSubscription.unsubscribe();
        gridLayoutSubscription.unsubscribe();
        sectionSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowIndex]
  );

  const toggleIsCollapsed = useCallback(() => {
    const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.value);
    newLayout[rowIndex].isCollapsed = !newLayout[rowIndex].isCollapsed;
    gridLayoutStateManager.gridLayout$.next(newLayout);
  }, [rowIndex, gridLayoutStateManager.gridLayout$]);

  useEffect(() => {
    /**
     * Set `aria-expanded` without passing the expanded state as a prop to `GridRowHeader` in order
     * to prevent `GridRowHeader` from rerendering when this state changes
     */
    if (!collapseButtonRef.current) return;
    collapseButtonRef.current.ariaExpanded = `${!isCollapsed}`;
  }, [isCollapsed]);

  const confirmDeleteRow = useCallback(() => {
    /**
     * Memoization of this callback does not need to be dependant on the React panel count
     * state, so just grab the panel count via gridLayoutStateManager instead
     */
    const count = Object.keys(
      gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels
    ).length;
    if (!Boolean(count)) {
      const newLayout = deleteRow(gridLayoutStateManager.gridLayout$.getValue(), rowIndex);
      gridLayoutStateManager.gridLayout$.next(newLayout);
    } else {
      setDeleteModalVisible(true);
    }
  }, [gridLayoutStateManager.gridLayout$, rowIndex]);

  return (
    <>
      {(activeSectionIndex === undefined || activeSectionIndex === rowIndex) && (
        <div
          css={[styles.fullHeight, styles.freeform]}
          className={classNames('kbnGridRowContainer', {
            'kbnGridRowContainer--collapsed': isCollapsed,
          })}
        >
          {activeSectionIndex !== undefined ? (
            <GridRowFooter rowIndex={rowIndex} confirmDeleteRow={confirmDeleteRow} />
          ) : (
            rowIndex !== 0 && (
              <GridRowHeader
                rowIndex={rowIndex}
                toggleIsCollapsed={toggleIsCollapsed}
                collapseButtonRef={collapseButtonRef}
                confirmDeleteRow={confirmDeleteRow}
              />
            )
          )}
          {!isCollapsed && (
            <div
              id={`kbnGridRow-${rowIndex}`}
              className={'kbnGridRow'}
              ref={(element: HTMLDivElement | null) =>
                (gridLayoutStateManager.rowRefs.current[rowIndex] = element)
              }
              css={[styles.fullHeight, styles.grid]}
              role="region"
              aria-labelledby={`kbnGridRowTile-${rowIndex}`}
            >
              {/* render the panels **in order** for accessibility, using the memoized panel components */}
              {panelIdsInOrder.map((panelId) => (
                <GridPanel key={panelId} panelId={panelId} rowIndex={rowIndex} />
              ))}
              <DragPreview rowIndex={rowIndex} />
            </div>
          )}
        </div>
      )}
      {deleteModalVisible && (
        <DeleteGridRowModal rowIndex={rowIndex} setDeleteModalVisible={setDeleteModalVisible} />
      )}
    </>
  );
});

const styles = {
  fullHeight: css({
    height: '100%',
  }),
  freeform: css({
    '.kbnGrid--freeform &': {
      display: 'flex',
      flexDirection: 'column-reverse',
      '.kbnGridRowHeader': {
        display: 'flex',
        justifyContent: 'center',
        flex: 0,
        backgroundColor: '#f6f9fc',
        borderTop: '1px solid #E3E8F2',
        padding: '12px',
        zIndex: 10000,
      },
      '.kbnGridRow': {
        flex: 1,
      },
    },
  }),
  grid: css({
    '.kbnGrid--freeform &': {
      display: 'block',
    },
    position: 'relative',
    justifyItems: 'stretch',
    display: 'grid',
    gap: 'calc(var(--kbnGridGutterSize) * 1px)',
    gridAutoRows: 'calc(var(--kbnGridRowHeight) * 1px)',
    gridTemplateColumns: `repeat(
          var(--kbnGridColumnCount),
          calc(
            (100% - (var(--kbnGridGutterSize) * (var(--kbnGridColumnCount) - 1) * 1px)) /
              var(--kbnGridColumnCount)
          )
        )`,
  }),
};

GridRow.displayName = 'KbnGridLayoutRow';
