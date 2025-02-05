/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { distinctUntilChanged, map } from 'rxjs';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { GridLayoutStateManager } from '../types';
import { deleteRow } from '../utils/row_management';
import { DeleteGridRowModal } from './delete_grid_row_modal';
import { GridRowTitle } from './grid_row_title';
import { useGridRowHeaderStyles } from './use_grid_row_header_styles';

export interface GridRowHeaderProps {
  rowIndex: number;
  gridLayoutStateManager: GridLayoutStateManager;
  toggleIsCollapsed: () => void;
}

export const GridRowHeader = React.memo(
  ({ rowIndex, gridLayoutStateManager, toggleIsCollapsed }: GridRowHeaderProps) => {
    const headerStyles = useGridRowHeaderStyles();

    const [editTitleOpen, setEditTitleOpen] = useState<boolean>(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
    const [readOnly, setReadOnly] = useState<boolean>(
      gridLayoutStateManager.accessMode$.getValue() === 'VIEW'
    );
    const [panelCount, setPanelCount] = useState<number>(
      Object.keys(gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels).length
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
       * This subscription is responsible for updating the panel count as the grid layout
       * gets updated so that the (X panels) label updates as expected
       */
      const panelCountSubscription = gridLayoutStateManager.gridLayout$
        .pipe(
          map((layout) => Object.keys(layout[rowIndex].panels).length),
          distinctUntilChanged()
        )
        .subscribe((count) => {
          setPanelCount(count);
        });

      return () => {
        accessModeSubscription.unsubscribe();
        panelCountSubscription.unsubscribe();
      };
    }, [gridLayoutStateManager, rowIndex]);

    const confirmDeleteRow = useCallback(() => {
      /**
       * memoization of this callback does not need to be dependant on the React panel count
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
        <EuiFlexGroup
          gutterSize="xs"
          alignItems="center"
          css={headerStyles}
          className="kbnGridRowHeader"
        >
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              color="text"
              aria-label={i18n.translate('kbnGridLayout.row.toggleCollapse', {
                defaultMessage: 'Toggle collapse',
              })}
              iconType={'arrowDown'}
              onClick={toggleIsCollapsed}
              css={styles.accordianArrow}
            />
          </EuiFlexItem>
          <GridRowTitle
            rowIndex={rowIndex}
            readOnly={readOnly}
            toggleIsCollapsed={toggleIsCollapsed}
            editTitleOpen={editTitleOpen}
            setEditTitleOpen={setEditTitleOpen}
            gridLayoutStateManager={gridLayoutStateManager}
          />
          {
            /**
             * Add actions at the end of the header section when the layout is editable + the section title
             * is not in edit mode
             */
            !editTitleOpen && (
              <>
                <EuiFlexItem grow={false} css={styles.hiddenOnCollapsed}>
                  <EuiText color="subdued" size="s" data-test-subj="kbnGridRowHeader--panelCount">
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
          <DeleteGridRowModal
            rowIndex={rowIndex}
            gridLayoutStateManager={gridLayoutStateManager}
            setDeleteModalVisible={setDeleteModalVisible}
          />
        )}
      </>
    );
  }
);

const styles = {
  accordianArrow: css({
    transform: 'rotate(0deg)',
    '.kbnGridRowContainer--collapsed &': {
      transform: 'rotate(-90deg) !important',
    },
  }),
  hiddenOnCollapsed: css({
    display: 'none',
    '.kbnGridRowContainer--collapsed &': {
      display: 'block',
    },
  }),
  floatToRight: css({
    marginLeft: 'auto',
  }),
};

GridRowHeader.displayName = 'GridRowHeader';
