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

import type { UseEuiTheme } from '@elastic/eui';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  euiCanAnimate,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { useGridLayoutSectionEvents } from '../use_grid_layout_events';
import { deleteSection } from '../utils/section_management';
import { DeleteGridSectionModal } from './delete_grid_section_modal';
import { GridSectionTitle } from './grid_section_title';
import type { CollapsibleSection } from './types';

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
        if (accessMode === 'VIEW') {
          gridLayoutStateManager.sectionRefs.current[sectionId]?.classList.remove(
            'kbnGridSection--headerHovered'
          );
        }
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

          const currentLayout = gridLayoutStateManager.gridLayout$.getValue();
          const section = currentLayout[sectionId];
          if (!section.isMainSection && !section.isCollapsed) {
            const newLayout = cloneDeep(currentLayout);
            (newLayout[sectionId] as CollapsibleSection).isCollapsed = true;
            gridLayoutStateManager.gridLayout$.next(newLayout);
          }

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

  const handleDragStart = useCallback(
    (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
      if (readOnly) return;
      const target = e.target as HTMLElement;
      if (target.closest('button, input, a, [role="button"]')) {
        return;
      }
      startDrag(e as React.MouseEvent);
    },
    [readOnly, startDrag]
  );

  const handleMouseEnter = useCallback(() => {
    if (readOnly) return;
    gridLayoutStateManager.sectionRefs.current[sectionId]?.classList.add(
      'kbnGridSection--headerHovered'
    );
  }, [readOnly, gridLayoutStateManager, sectionId]);

  const handleMouseLeave = useCallback(() => {
    gridLayoutStateManager.sectionRefs.current[sectionId]?.classList.remove(
      'kbnGridSection--headerHovered'
    );
  }, [gridLayoutStateManager, sectionId]);

  return (
    <>
      <EuiFlexGroup
        gutterSize="xs"
        responsive={false}
        alignItems="center"
        css={(theme) => styles.headerStyles(theme, sectionId, readOnly)}
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
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
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
              <EuiFlexItem grow={false}>
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
              {!readOnly && !isActive && (
                <EuiFlexItem grow={false} css={styles.floatToRight}>
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
  floatToRight: css({
    marginLeft: 'auto',
  }),
  headerStyles: (themeContext: UseEuiTheme, sectionId: string, isReadOnly: boolean) => {
    const { euiTheme } = themeContext;
    return css({
      gridColumnStart: 1,
      gridColumnEnd: -1,
      gridRowStart: `span 1`,
      gridRowEnd: `start-${sectionId}`,
      height: `${euiTheme.size.xl}`,
      position: 'relative',
      ...(!isReadOnly && {
        cursor: 'grab',
        touchAction: 'none',
      }),
      '.kbnGridLayout--panelCount': {
        textWrapMode: 'nowrap',
      },

      '.kbnGridLayout--deleteSectionIcon': {
        marginLeft: euiTheme.size.xs,
        opacity: '0',
        [`${euiCanAnimate}`]: {
          transition: `opacity ${euiTheme.animation.extraFast} ease-in`,
        },
      },
      [`&:hover .kbnGridLayout--deleteSectionIcon,
        &:has(:focus-visible) .kbnGridLayout--deleteSectionIcon`]: {
        opacity: 1,
      },

      '&.kbnGridSectionHeader--active': {
        zIndex: euiTheme.levels.modal,
        cursor: 'grabbing',
      },
    });
  },
};

GridSectionHeader.displayName = 'GridSectionHeader';
