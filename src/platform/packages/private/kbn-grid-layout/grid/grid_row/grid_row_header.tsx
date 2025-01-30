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
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiText,
  euiCanAnimate,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { GridLayoutStateManager } from '../types';

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

  const updateTitle = useCallback(
    (title: string) => {
      const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.getValue());
      newLayout[rowIndex].title = title;
      gridLayoutStateManager.gridLayout$.next(newLayout);
    },
    [rowIndex, gridLayoutStateManager.gridLayout$]
  );

  return (
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
          onSave={updateTitle}
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
                // &:after {
                //   flex: 0;
                //   display: block;
                //   content: '(10 panels)';
                //   color: ${euiTheme.colors.textSubdued};
                // }
              }
            `,
          }}
        />
      </EuiFlexItem>
      {!readOnly && !editMode && (
        <>
          {isCollapsed && (
            <EuiFlexItem grow={false}>
              <EuiText color="subdued" size="s">{`(${
                Object.keys(gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels).length
              } panels)`}</EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="trash"
              color="danger"
              className="kbnGridLayout--deleteRowIcon"
            />
          </EuiFlexItem>
        </>
      )}
      {isCollapsed && (
        <EuiFlexItem>
          <EuiButtonIcon iconType="move" color="text" className="kbnGridLayout--moveRowIcon" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
