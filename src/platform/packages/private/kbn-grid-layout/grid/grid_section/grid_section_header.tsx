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
import { distinctUntilChanged, map, pairwise } from 'rxjs';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  UseEuiTheme,
  euiCanAnimate,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { GridSectionData } from '../types';
import { useGridLayoutContext } from '../use_grid_layout_context';
import { useGridLayoutRowEvents } from '../use_grid_layout_events';
import { deleteRow } from '../utils/section_management';
import { DeleteGridSectionModal } from './delete_grid_section_modal';
import { GridSectionDragPreview } from './grid_section_drag_preview';
import { GridSectionTitle } from './grid_section_title';

export interface GridSectionHeaderProps {
  sectionId: string;
}

export const GridSectionHeader = React.memo(({ sectionId }: GridSectionHeaderProps) => {
  const collapseButtonRef = useRef<HTMLButtonElement | null>(null);

  const { gridLayoutStateManager } = useGridLayoutContext();
  const { startDrag, onBlur } = useGridLayoutRowEvents({ sectionId });

  const [isActive, setIsActive] = useState<boolean>(false);
  const [editTitleOpen, setEditTitleOpen] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [readOnly, setReadOnly] = useState<boolean>(
    gridLayoutStateManager.accessMode$.getValue() === 'VIEW'
  );
  const [panelCount, setPanelCount] = useState<number>(
    Object.keys(
      (gridLayoutStateManager.gridLayout$.getValue()[sectionId] as unknown as GridSectionData)
        .panels
    ).length
  );

  useEffect(() => {
    return () => {
      // remove reference on unmount
      delete gridLayoutStateManager.headerRefs.current[sectionId];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    /**
     * This subscription is responsible for controlling whether or not the section title is
     * editable and hiding all other "edit mode" actions (delete section, move section, etc)
     */
    const accessModeSubscription = gridLayoutStateManager.accessMode$
      .pipe(distinctUntilChanged())
      .subscribe((accessMode) => {
        setReadOnly(accessMode === 'VIEW');
      });

    /**
     * This subscription is responsible for keeping the panel count in sync
     */
    const panelCountSubscription = gridLayoutStateManager.gridLayout$
      .pipe(
        map((layout) => Object.keys(layout[sectionId]?.panels ?? {}).length),
        distinctUntilChanged()
      )
      .subscribe((count) => {
        setPanelCount(count);
      });

    /**
     * This subscription is responsible for handling the drag + drop styles for
     * re-ordering grid rows
     */
    const dragRowStyleSubscription = gridLayoutStateManager.activeRowEvent$
      .pipe(
        pairwise(),
        map(([before, after]) => {
          if (!before && after) {
            return { type: 'init', activeRowEvent: after };
          } else if (before && after) {
            return { type: 'update', activeRowEvent: after };
          } else {
            return { type: 'finish', activeRowEvent: before };
          }
        })
      )
      .subscribe(({ type, activeRowEvent }) => {
        const headerRef = gridLayoutStateManager.headerRefs.current[sectionId];
        if (!headerRef || activeRowEvent?.id !== sectionId) return;

        if (type === 'init') {
          setIsActive(true);
          const width = headerRef.getBoundingClientRect().width;
          headerRef.style.position = 'fixed';
          headerRef.style.width = `${width}px`;
          headerRef.style.top = `${activeRowEvent.startingPosition.top}px`;
          headerRef.style.left = `${activeRowEvent.startingPosition.left}px`;
        } else if (type === 'update') {
          headerRef.style.transform = `translate(${activeRowEvent.translate.left}px, ${activeRowEvent.translate.top}px)`;
        } else {
          setIsActive(false);
          headerRef.style.position = 'relative';
          headerRef.style.width = ``;
          headerRef.style.top = ``;
          headerRef.style.left = ``;
          headerRef.style.transform = ``;
        }
      });

    const collapsedStateSubscription = gridLayoutStateManager.gridLayout$
      .pipe(
        map((gridLayout) => {
          const row = gridLayout[sectionId];
          return row && (row.isMainSection || row.isCollapsed);
        })
      )
      .subscribe((collapsed) => {
        const headerRef = gridLayoutStateManager.headerRefs.current[sectionId];
        if (!headerRef) return;

        if (collapsed) {
          headerRef.classList.add('kbnGridSectionHeader--collapsed');
        } else {
          headerRef.classList.remove('kbnGridSectionHeader--collapsed');
        }
      });

    return () => {
      accessModeSubscription.unsubscribe();
      panelCountSubscription.unsubscribe();
      dragRowStyleSubscription.unsubscribe();
      collapsedStateSubscription.unsubscribe();
    };
  }, [gridLayoutStateManager, sectionId]);

  const confirmDeleteRow = useCallback(() => {
    /**
     * Memoization of this callback does not need to be dependant on the React panel count
     * state, so just grab the panel count via gridLayoutStateManager instead
     */
    const count = Object.keys(
      gridLayoutStateManager.gridLayout$.getValue()[sectionId].panels
    ).length;
    if (!Boolean(count)) {
      const newLayout = deleteRow(gridLayoutStateManager.gridLayout$.getValue(), sectionId);
      gridLayoutStateManager.gridLayout$.next(newLayout);
    } else {
      setDeleteModalVisible(true);
    }
  }, [gridLayoutStateManager, sectionId]);

  const toggleIsCollapsed = useCallback(() => {
    const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.value);
    const section = newLayout[sectionId];
    if (section.isMainSection) return;

    section.isCollapsed = !section.isCollapsed;
    gridLayoutStateManager.gridLayout$.next(newLayout);
  }, [gridLayoutStateManager, sectionId]);

  const setRef = useCallback(
    (element: HTMLDivElement | null) => {
      gridLayoutStateManager.headerRefs.current[sectionId] = element;
    },
    [gridLayoutStateManager, sectionId]
  );

  return (
    <>
      <EuiFlexGroup
        gutterSize="xs"
        responsive={false}
        alignItems="center"
        css={(theme) => styles.headerStyles(theme, sectionId)}
        className={classNames('kbnGridSectionHeader', {
          'kbnGridSectionHeader--active': isActive,
          'kbnGridSectionHeader--collapsed': (
            gridLayoutStateManager.gridLayout$.getValue()[sectionId] as unknown as GridSectionData
          ).isCollapsed,
        })}
        data-test-subj={`kbnGridSectionHeader-${sectionId}`}
        ref={setRef}
      >
        <GridSectionTitle
          sectionId={sectionId}
          readOnly={readOnly || isActive}
          toggleIsCollapsed={toggleIsCollapsed}
          editTitleOpen={editTitleOpen}
          setEditTitleOpen={setEditTitleOpen}
          collapseButtonRef={collapseButtonRef}
        />
        {
          /**
           * Add actions at the end of the header section when the layout is editable + the section title
           * is not in edit mode
           */
          !editTitleOpen && (
            <>
              <EuiFlexItem grow={false} css={styles.visibleOnlyWhenCollapsed}>
                <EuiText
                  color="subdued"
                  size="s"
                  data-test-subj={`kbnGridSectionHeader-${sectionId}--panelCount`}
                  className={'kbnGridLayout--panelCount'}
                >
                  {i18n.translate('kbnGridLayout.rowHeader.panelCount', {
                    defaultMessage:
                      '({panelCount} {panelCount, plural, one {panel} other {panels}})',
                    values: {
                      panelCount,
                    },
                  })}
                </EuiText>
              </EuiFlexItem>
              {!readOnly && (
                <>
                  {!isActive && (
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        className="kbnGridLayout--deleteRowIcon"
                        onClick={confirmDeleteRow}
                        aria-label={i18n.translate('kbnGridLayout.row.deleteRow', {
                          defaultMessage: 'Delete section',
                        })}
                      />
                    </EuiFlexItem>
                  )}
                  <EuiFlexItem
                    grow={false}
                    css={[styles.floatToRight, styles.visibleOnlyWhenCollapsed]}
                  >
                    <EuiButtonIcon
                      iconType="move"
                      color="text"
                      className="kbnGridLayout--moveRowIcon"
                      aria-label={i18n.translate('kbnGridLayout.row.moveRow', {
                        defaultMessage: 'Move section',
                      })}
                      onMouseDown={startDrag}
                      onTouchStart={startDrag}
                      onKeyDown={startDrag}
                      onBlur={onBlur}
                      data-test-subj={`kbnGridSectionHeader-${sectionId}--dragHandle`}
                    />
                  </EuiFlexItem>
                </>
              )}
            </>
          )
        }
      </EuiFlexGroup>
      {isActive && <GridSectionDragPreview sectionId={sectionId} />}
      {deleteModalVisible && (
        <DeleteGridSectionModal
          sectionId={sectionId}
          setDeleteModalVisible={setDeleteModalVisible}
        />
      )}
    </>
  );
});

const styles = {
  visibleOnlyWhenCollapsed: css({
    display: 'none',
    '.kbnGridSectionHeader--collapsed &': {
      display: 'block',
    },
  }),
  floatToRight: css({
    marginLeft: 'auto',
  }),
  headerStyles: ({ euiTheme }: UseEuiTheme, sectionId: string) =>
    css({
      gridColumnStart: 1,
      gridColumnEnd: -1,
      gridRowStart: `start-${sectionId}`,
      gridRowEnd: `auto`,
      height: `${euiTheme.size.xl}`,
      // border: '1px solid transparent', // prevents layout shift
      '&.kbnGridSectionHeader--collapsed:not(.kbnGridSectionHeader--active)': {
        // borderBottom: euiTheme.border.thin,
      },
      '.kbnGridLayout--deleteRowIcon': {
        marginLeft: euiTheme.size.xs,
      },
      '.kbnGridLayout--panelCount': {
        textWrapMode: 'nowrap', // prevent panel count from wrapping
      },
      '.kbnGridLayout--moveRowIcon': {
        cursor: 'move',
        touchAction: 'none',
        '&:active, &:hover, &:focus': {
          transform: 'none !important', // prevent "bump up" that EUI adds on hover
          backgroundColor: 'transparent',
        },
      },

      // these styles hide the delete + move actions by default and only show them on hover
      [`.kbnGridLayout--deleteRowIcon,
        .kbnGridLayout--moveRowIcon`]: {
        opacity: '0',
        [`${euiCanAnimate}`]: {
          transition: `opacity ${euiTheme.animation.extraFast} ease-in`,
        },
      },
      [`&:hover .kbnGridLayout--deleteRowIcon, 
        &:hover .kbnGridLayout--moveRowIcon,
        &:has(:focus-visible) .kbnGridLayout--deleteRowIcon,
        &:has(:focus-visible) .kbnGridLayout--moveRowIcon`]: {
        opacity: 1,
      },

      // these styles ensure that dragged rows are rendered **above** everything else + the move icon stays visible
      '&.kbnGridSectionHeader--active': {
        zIndex: euiTheme.levels.modal,
        '.kbnGridLayout--moveRowIcon': {
          cursor: 'move',
          opacity: 1,
          pointerEvents: 'auto',
        },
      },
    }),
};

GridSectionHeader.displayName = 'GridSectionHeader';
