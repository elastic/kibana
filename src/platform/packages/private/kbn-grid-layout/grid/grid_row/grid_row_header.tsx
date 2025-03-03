/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useState } from 'react';
import { distinctUntilChanged, map } from 'rxjs';

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
import { deleteRow } from '../utils/row_management';
import { DeleteGridRowModal } from './delete_grid_row_modal';
import { GridRowTitle } from './grid_row_title';

export interface GridRowHeaderProps {
  rowId: string;
  toggleIsCollapsed: () => void;
  collapseButtonRef: React.MutableRefObject<HTMLButtonElement | null>;
}

export const GridRowHeader = React.memo(
  ({ rowId, toggleIsCollapsed, collapseButtonRef }: GridRowHeaderProps) => {
    const { gridLayoutStateManager } = useGridLayoutContext();

    const [editTitleOpen, setEditTitleOpen] = useState<boolean>(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
    const [readOnly, setReadOnly] = useState<boolean>(
      gridLayoutStateManager.accessMode$.getValue() === 'VIEW'
    );
    const [panelCount, setPanelCount] = useState<number>(
      Object.keys(gridLayoutStateManager.gridLayout$.getValue()[rowId].panels).length
    );

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
          map((layout) => Object.keys(layout[rowId]?.panels ?? {}).length),
          distinctUntilChanged()
        )
        .subscribe((count) => {
          setPanelCount(count);
        });

      return () => {
        accessModeSubscription.unsubscribe();
        panelCountSubscription.unsubscribe();
      };
    }, [gridLayoutStateManager, rowId]);

    const confirmDeleteRow = useCallback(() => {
      /**
       * Memoization of this callback does not need to be dependant on the React panel count
       * state, so just grab the panel count via gridLayoutStateManager instead
       */
      const count = Object.keys(gridLayoutStateManager.gridLayout$.getValue()[rowId].panels).length;
      if (!Boolean(count)) {
        const newLayout = deleteRow(gridLayoutStateManager.gridLayout$.getValue(), rowId);
        gridLayoutStateManager.gridLayout$.next(newLayout);
      } else {
        setDeleteModalVisible(true);
      }
    }, [gridLayoutStateManager.gridLayout$, rowId]);

    return (
      <>
        <EuiFlexGroup
          gutterSize="xs"
          responsive={false}
          alignItems="center"
          css={styles.headerStyles}
          className="kbnGridRowHeader"
          data-test-subj={`kbnGridRowHeader-${rowId}`}
        >
          <GridRowTitle
            rowId={rowId}
            readOnly={readOnly}
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
                <EuiFlexItem grow={false} css={styles.hiddenOnCollapsed}>
                  <EuiText
                    color="subdued"
                    size="s"
                    data-test-subj={`kbnGridRowHeader-${rowId}--panelCount`}
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
                    <EuiFlexItem grow={false} css={[styles.hiddenOnCollapsed, styles.floatToRight]}>
                      {/*
                        This was added as a placeholder to get the desired UI here; however, since the
                        functionality will be implemented in https://github.com/elastic/kibana/issues/190381
                        and this button doesn't do anything yet, I'm choosing to hide it for now. I am keeping
                        the `FlexItem` wrapper so that the UI still looks correct.
                      */}
                      {/* <EuiButtonIcon
                        iconType="move"
                        color="text"
                        className="kbnGridLayout--moveRowIcon"
                        aria-label={i18n.translate('kbnGridLayout.row.moveRow', {
                          defaultMessage: 'Move section',
                        })}
                      /> */}
                    </EuiFlexItem>
                  </>
                )}
              </>
            )
          }
        </EuiFlexGroup>
        {deleteModalVisible && (
          <DeleteGridRowModal rowId={rowId} setDeleteModalVisible={setDeleteModalVisible} />
        )}
      </>
    );
  }
);

const styles = {
  hiddenOnCollapsed: css({
    display: 'none',
    '.kbnGridRowContainer--collapsed &': {
      display: 'block',
    },
  }),
  floatToRight: css({
    marginLeft: 'auto',
  }),
  headerStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      height: `calc(${euiTheme.size.xl} + (2 * ${euiTheme.size.s}))`,
      padding: `${euiTheme.size.s} 0px`,
      borderBottom: '1px solid transparent', // prevents layout shift
      '.kbnGridRowContainer--collapsed &': {
        borderBottom: euiTheme.border.thin,
      },
      '.kbnGridLayout--deleteRowIcon': {
        marginLeft: euiTheme.size.xs,
      },
      '.kbnGridLayout--panelCount': {
        textWrapMode: 'nowrap', // prevent panel count from wrapping
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
    }),
};

GridRowHeader.displayName = 'GridRowHeader';
