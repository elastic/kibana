/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useEffect, useState } from 'react';
import { distinctUntilChanged } from 'rxjs';

import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { GridLayoutStateManager } from '../types';
import { deleteRow } from '../utils/row_management';
import { DeleteGridRowModal } from './delete_grid_row_modal';
import { GridRowTitle } from './grid_row_title';
import { useGridRowHeaderStyles } from './use_grid_row_header_styles';

export const GridRowHeader = React.memo(
  ({
    rowIndex,
    gridLayoutStateManager,
    toggleIsCollapsed,
  }: {
    rowIndex: number;
    gridLayoutStateManager: GridLayoutStateManager;
    toggleIsCollapsed: () => void;
  }) => {
    const headerStyles = useGridRowHeaderStyles();

    const [editTitleOpen, setEditTitleOpen] = useState<boolean>(false);
    const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);
    const [readOnly, setReadOnly] = useState<boolean>(
      gridLayoutStateManager.accessMode$.getValue() === 'VIEW'
    );

    useEffect(() => {
      const accessModeSubscription = gridLayoutStateManager.accessMode$
        .pipe(distinctUntilChanged())
        .subscribe((accessMode) => {
          setReadOnly(accessMode === 'VIEW');
        });

      return () => {
        accessModeSubscription.unsubscribe();
      };
    }, [gridLayoutStateManager]);

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
                  <EuiText color="subdued" size="s">{`(${
                    /**
                     * we can get away with grabbing the panel count without React state because this count
                     * is only rendered when the section is collapsed, and the count can only be updated when
                     * the section isn't collapsed
                     */
                    Object.keys(gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels)
                      .length
                  } panels)`}</EuiText>
                </EuiFlexItem>
                {!readOnly && (
                  <>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        className="kbnGridLayout--deleteRowIcon"
                        onClick={() => {
                          const panelCount = Object.keys(
                            gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels
                          ).length;
                          if (!Boolean(panelCount)) {
                            const newLayout = deleteRow(
                              gridLayoutStateManager.gridLayout$.getValue(),
                              rowIndex
                            );
                            gridLayoutStateManager.gridLayout$.next(newLayout);
                          } else {
                            setDeleteModalVisible(true);
                          }
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false} css={[styles.hiddenOnCollapsed, styles.floatToRight]}>
                      <EuiButtonIcon
                        iconType="move"
                        color="text"
                        className="kbnGridLayout--moveRowIcon"
                      />
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
