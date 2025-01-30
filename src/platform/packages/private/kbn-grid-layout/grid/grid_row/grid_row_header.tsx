/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { cloneDeep } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { distinctUntilChanged, map } from 'rxjs';

import {
  EuiButtonIcon,
  EuiModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiText,
  euiCanAnimate,
  useEuiTheme,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButton,
  EuiButtonEmpty,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { GridLayoutData, GridLayoutStateManager } from '../types';
import { resolveGridRow } from '../utils/resolve_grid_row';

export const GridRowHeader = ({
  rowIndex,
  gridLayoutStateManager,
  isCollapsed,
  toggleIsCollapsed,
}: {
  rowIndex: number;
  gridLayoutStateManager: GridLayoutStateManager;
  isCollapsed: boolean;
  toggleIsCollapsed: () => void;
}) => {
  const { euiTheme } = useEuiTheme();

  const currentRow = gridLayoutStateManager.gridLayout$.getValue()[rowIndex];

  const [editMode, setEditMode] = useState<boolean>(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState<boolean>(false);

  const [readOnly, setReadOnly] = useState<boolean>(
    gridLayoutStateManager.accessMode$.getValue() === 'VIEW'
  );
  const [rowTitle, setRowTitle] = useState<string>(currentRow.title);

  useEffect(() => {
    const titleSubscription = gridLayoutStateManager.gridLayout$
      .pipe(
        map((gridLayout) => gridLayout[rowIndex].title),
        distinctUntilChanged()
      )
      .subscribe((title) => {
        setRowTitle(title);
      });

    const accessModeSubscription = gridLayoutStateManager.accessMode$
      .pipe(distinctUntilChanged())
      .subscribe((accessMode) => {
        setReadOnly(accessMode === 'VIEW');
      });

    return () => {
      titleSubscription.unsubscribe();
      accessModeSubscription.unsubscribe();
    };
  }, [rowIndex, gridLayoutStateManager]);

  const updateTitle = useCallback((layout: GridLayoutData, index: number, title: string) => {
    const newLayout = cloneDeep(layout);
    newLayout[index].title = title;
    return newLayout;
  }, []);

  const movePanelsToRow = useCallback(
    (layout: GridLayoutData, startingRow: number, newRow: number) => {
      const newLayout = cloneDeep(layout);
      const panelsToMove = newLayout[startingRow].panels;
      const maxRow = Math.max(
        ...Object.values(newLayout[newRow].panels).map(({ row, height }) => row + height)
      );
      Object.keys(panelsToMove).forEach((index) => (panelsToMove[index].row += maxRow));
      newLayout[newRow].panels = { ...newLayout[newRow].panels, ...panelsToMove };
      newLayout[newRow] = resolveGridRow(newLayout[newRow]);
      return newLayout;
    },
    []
  );

  const deleteSection = useCallback((layout: GridLayoutData, index: number) => {
    const newLayout = cloneDeep(layout);
    newLayout.splice(index, 1);
    return newLayout;
  }, []);

  return (
    <>
      <EuiFlexGroup
        gutterSize="xs"
        alignItems="center"
        css={css`
          border-bottom: ${isCollapsed ? euiTheme.border.thin : 'none'};
          padding: ${euiTheme.size.s} 0px;

          .kbnGridLayout--deleteRowIcon {
            margin-left: ${euiTheme.size.xs};
          }
          .kbnGridLayout--moveRowIcon {
            margin-left: auto;
          }

          // these styles hide the delete + move actions by default and only show them on hover
          .kbnGridLayout--deleteRowIcon,
          .kbnGridLayout--moveRowIcon {
            opacity: 0;
            ${euiCanAnimate} {
              transition: opacity ${euiTheme.animation.extraFast} ease-in;
            }
          }
          &:hover .kbnGridLayout--deleteRowIcon,
          &:hover .kbnGridLayout--moveRowIcon {
            opacity: 1;
          }
        `}
        className="kbnGridRowHeader"
      >
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            color="text"
            aria-label={i18n.translate('kbnGridLayout.row.toggleCollapse', {
              defaultMessage: 'Toggle collapse',
            })}
            iconType={isCollapsed ? 'arrowRight' : 'arrowDown'}
            onClick={toggleIsCollapsed}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={editMode}>
          <EuiInlineEditTitle
            heading="h2"
            size="xs"
            isReadOnly={readOnly}
            inputAriaLabel="Edit title inline"
            defaultValue={rowTitle}
            onSave={(title) => {
              const newLayout = updateTitle(
                gridLayoutStateManager.gridLayout$.getValue(),
                rowIndex,
                title
              );
              gridLayoutStateManager.gridLayout$.next(newLayout);
            }}
            onClick={() => {
              if (readOnly) {
                toggleIsCollapsed();
              } else {
                setEditMode(!editMode);
              }
            }}
            readModeProps={{
              onClick: readOnly ? toggleIsCollapsed : undefined,
              css: css`
                &:hover,
                &:focus {
                  text-decoration: none !important;
                }
                & svg {
                  inline-size: 16px;
                  block-size: 16px;
                }
                .euiButtonEmpty__content {
                  gap: ${euiTheme.size.xs}; // decrease gap between title and pencil icon
                }
              `,
            }}
          />
        </EuiFlexItem>
        {
          /**
           * Add actions at the end of the header section when the layout is editable + the section title
           * is not in edit mode
           */
          !readOnly && !editMode && (
            <>
              {isCollapsed && (
                <EuiFlexItem grow={false}>
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
              )}
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="trash"
                  color="danger"
                  className="kbnGridLayout--deleteRowIcon"
                  onClick={() => {
                    const panelCount = Object.keys(
                      gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels
                    ).length;
                    if (!panelCount) {
                      deleteSection(gridLayoutStateManager.gridLayout$.getValue(), rowIndex);
                    } else {
                      setDeleteModalVisible(true);
                    }
                  }}
                />
              </EuiFlexItem>
              {isCollapsed && (
                <EuiFlexItem>
                  <EuiButtonIcon
                    iconType="move"
                    color="text"
                    className="kbnGridLayout--moveRowIcon"
                  />
                </EuiFlexItem>
              )}
            </>
          )
        }
      </EuiFlexGroup>
      {deleteModalVisible && (
        <EuiModal
          onClose={() => {
            setDeleteModalVisible(false);
          }}
        >
          <EuiModalHeader>
            <EuiModalHeaderTitle>Delete section</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiModalBody>
            {`Are you sure you want to remove this section and its ${
              Object.keys(gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels).length
            } panels?`}
          </EuiModalBody>
          <EuiModalFooter>
            <EuiButtonEmpty
              onClick={() => {
                setDeleteModalVisible(false);
              }}
            >
              Cancel
            </EuiButtonEmpty>
            <EuiButton
              onClick={() => {
                setDeleteModalVisible(false);
                const newLayout = deleteSection(
                  gridLayoutStateManager.gridLayout$.getValue(),
                  rowIndex
                );
                gridLayoutStateManager.gridLayout$.next(newLayout);
              }}
              fill
              color="danger"
            >
              Yes
            </EuiButton>
            <EuiButton
              onClick={() => {
                setDeleteModalVisible(false);
                let newLayout = movePanelsToRow(
                  gridLayoutStateManager.gridLayout$.getValue(),
                  rowIndex,
                  0
                );
                newLayout = deleteSection(newLayout, rowIndex);
                gridLayoutStateManager.gridLayout$.next(newLayout);
              }}
              fill
            >
              Delete section only
            </EuiButton>
          </EuiModalFooter>
        </EuiModal>
      )}
    </>
  );
};
