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

import { useGridLayoutContext } from '../use_grid_layout_context';
import { useGridLayoutSectionEvents } from '../use_grid_layout_events';
import { deleteSection } from '../utils/section_management';
import { DeleteGridSectionModal } from './delete_grid_section_modal';
import { GridSectionTitle } from './grid_section_title';
import { CollapsibleSection } from './types';

export interface GridSectionHeaderProps {
  sectionId: string;
}

export const GridSectionHeader = React.memo(({ sectionId }: GridSectionHeaderProps) => {
  const collapseButtonRef = useRef<HTMLButtonElement | null>(null);

  const { gridLayoutStateManager } = useGridLayoutContext();
  const startDrag = useGridLayoutSectionEvents({ sectionId });

  const [isActive, setIsActive] = useState<boolean>(false);
  const [editTitleOpen, setEditTitleOpen] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
  const [readOnly, setReadOnly] = useState<boolean>(
    gridLayoutStateManager.accessMode$.getValue() === 'VIEW'
  );
  const [panelCount, setPanelCount] = useState<number>(
    Object.keys(gridLayoutStateManager.gridLayout$.getValue()[sectionId]?.panels ?? {}).length
  );

  useEffect(() => {
    return () => {
      // remove reference on unmount
      delete gridLayoutStateManager.headerRefs.current[sectionId];
    };
  }, [sectionId, gridLayoutStateManager]);

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
    const dragRowStyleSubscription = gridLayoutStateManager.activeSectionEvent$
      .pipe(
        pairwise(),
        map(([before, after]) => {
          if (!before && after) {
            return { type: 'init', activeSectionEvent: after };
          } else if (before && after) {
            return { type: 'update', activeSectionEvent: after };
          } else {
            return { type: 'finish', activeSectionEvent: before };
          }
        })
      )
      .subscribe(({ type, activeSectionEvent }) => {
        const headerRef = gridLayoutStateManager.headerRefs.current[sectionId];
        if (!headerRef || activeSectionEvent?.id !== sectionId) return;

        if (type === 'init') {
          setIsActive(true);
          const width = headerRef.getBoundingClientRect().width;
          headerRef.style.position = 'fixed';
          headerRef.style.width = `${width}px`;
          headerRef.style.top = `${activeSectionEvent.startingPosition.top}px`;
          headerRef.style.left = `${activeSectionEvent.startingPosition.left}px`;
        } else if (type === 'update') {
          headerRef.style.transform = `translate(${activeSectionEvent.translate.left}px, ${activeSectionEvent.translate.top}px)`;
        } else {
          setIsActive(false);
          headerRef.style.position = ``;
          headerRef.style.width = ``;
          headerRef.style.top = ``;
          headerRef.style.left = ``;
          headerRef.style.transform = ``;
        }
      });

    /**
     * This subscription is responsible for setting the collapsed state class name
     */
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

  const confirmDeleteSection = useCallback(() => {
    /**
     * Memoization of this callback does not need to be dependant on the React panel count
     * state, so just grab the panel count via gridLayoutStateManager instead
     */
    const count = Object.keys(
      gridLayoutStateManager.gridLayout$.getValue()[sectionId].panels
    ).length;
    if (!Boolean(count)) {
      const newLayout = deleteSection(gridLayoutStateManager.gridLayout$.getValue(), sectionId);
      gridLayoutStateManager.gridLayout$.next(newLayout);
    } else {
      setDeleteModalVisible(true);
    }
  }, [gridLayoutStateManager, sectionId]);

  /**
   * Callback for collapsing and/or expanding the section when the title button is clicked
   */
  const toggleIsCollapsed = useCallback(() => {
    const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.value);
    const section = newLayout[sectionId];
    if (section.isMainSection) return;

    section.isCollapsed = !section.isCollapsed;
    gridLayoutStateManager.gridLayout$.next(newLayout);

    const buttonRef = collapseButtonRef.current;
    if (!buttonRef) return;
    buttonRef.setAttribute('aria-expanded', `${!section.isCollapsed}`);
  }, [gridLayoutStateManager, sectionId]);

  return (
    <>
      <EuiFlexGroup
        gutterSize="xs"
        responsive={false}
        alignItems="center"
        css={(theme) => styles.headerStyles(theme, sectionId)}
        className={classNames('kbnGridSectionHeader', {
          'kbnGridSectionHeader--active': isActive,
          // sets the collapsed state on mount
          'kbnGridSectionHeader--collapsed': (
            gridLayoutStateManager.gridLayout$.getValue()[sectionId] as
              | CollapsibleSection
              | undefined
          )?.isCollapsed,
        })}
        data-test-subj={`kbnGridSectionHeader-${sectionId}`}
        ref={(element: HTMLDivElement | null) => {
          gridLayoutStateManager.headerRefs.current[sectionId] = element;
        }}
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
                  {i18n.translate('kbnGridLayout.section.panelCount', {
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
                        className="kbnGridLayout--deleteSectionIcon"
                        onClick={confirmDeleteSection}
                        aria-label={i18n.translate('kbnGridLayout.section.deleteSection', {
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
                      className="kbnGridSection--dragHandle"
                      aria-label={i18n.translate('kbnGridLayout.section.moveRow', {
                        defaultMessage: 'Move section',
                      })}
                      onMouseDown={startDrag}
                      onTouchStart={startDrag}
                      onKeyDown={startDrag}
                      data-test-subj={`kbnGridSectionHeader-${sectionId}--dragHandle`}
                    />
                  </EuiFlexItem>
                </>
              )}
            </>
          )
        }
      </EuiFlexGroup>
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
      gridRowStart: `span 1`,
      gridRowEnd: `start-${sectionId}`,
      height: `${euiTheme.size.xl}`,
      '.kbnGridLayout--deleteSectionIcon': {
        marginLeft: euiTheme.size.xs,
      },
      '.kbnGridLayout--panelCount': {
        textWrapMode: 'nowrap', // prevent panel count from wrapping
      },
      '.kbnGridSection--dragHandle': {
        cursor: 'move',
        touchAction: 'none',
        '&:active, &:hover, &:focus': {
          transform: 'none !important', // prevent "bump up" that EUI adds on hover
          backgroundColor: 'transparent',
        },
      },

      // these styles hide the delete + move actions by default and only show them on hover
      [`.kbnGridLayout--deleteSectionIcon,
        .kbnGridSection--dragHandle`]: {
        opacity: '0',
        [`${euiCanAnimate}`]: {
          transition: `opacity ${euiTheme.animation.extraFast} ease-in`,
        },
      },
      [`&:hover .kbnGridLayout--deleteSectionIcon, 
        &:hover .kbnGridSection--dragHandle,
        &:has(:focus-visible) .kbnGridLayout--deleteSectionIcon,
        &:has(:focus-visible) .kbnGridSection--dragHandle`]: {
        opacity: 1,
      },

      // these styles ensure that dragged sections are rendered **above** everything else + the move icon stays visible
      '&.kbnGridSectionHeader--active': {
        zIndex: euiTheme.levels.modal,
        '.kbnGridSection--dragHandle': {
          cursor: 'move',
          opacity: 1,
          pointerEvents: 'auto',
        },
      },
    }),
};

GridSectionHeader.displayName = 'GridSectionHeader';
