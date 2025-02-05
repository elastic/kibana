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

import { EuiButtonIcon, EuiFlexItem, EuiInlineEditTitle, EuiLink, EuiTitle } from '@elastic/eui';

import { GridLayoutStateManager } from '../types';

export const GridRowTitle = React.memo(
  ({
    readOnly,
    rowIndex,
    editTitleOpen,
    setEditTitleOpen,
    toggleIsCollapsed,
    gridLayoutStateManager,
  }: {
    readOnly: boolean;
    rowIndex: number;
    editTitleOpen: boolean;
    setEditTitleOpen: (value: boolean) => void;
    toggleIsCollapsed: () => void;
    gridLayoutStateManager: GridLayoutStateManager;
  }) => {
    const currentRow = gridLayoutStateManager.gridLayout$.getValue()[rowIndex];
    const [rowTitle, setRowTitle] = useState<string>(currentRow.title);

    useEffect(() => {
      /**
       * This subscription ensures that the row will re-render when the section title changes
       */
      const titleSubscription = gridLayoutStateManager.gridLayout$
        .pipe(
          map((gridLayout) => gridLayout[rowIndex]?.title ?? ''),
          distinctUntilChanged()
        )
        .subscribe((title) => {
          setRowTitle(title);
        });

      return () => {
        titleSubscription.unsubscribe();
      };
    }, [rowIndex, gridLayoutStateManager]);

    const updateTitle = useCallback(
      (title: string) => {
        const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.getValue());
        newLayout[rowIndex].title = title;
        gridLayoutStateManager.gridLayout$.next(newLayout);
        setEditTitleOpen(false);
      },
      [rowIndex, setEditTitleOpen, gridLayoutStateManager.gridLayout$]
    );

    return (
      <>
        {!readOnly && editTitleOpen ? (
          <EuiFlexItem grow={true}>
            {/* @ts-ignore - EUI typing issue that will be resolved with https://github.com/elastic/eui/pull/8307 */}
            <EuiInlineEditTitle
              size="xs"
              heading="h2"
              defaultValue={rowTitle}
              onCancel={() => setEditTitleOpen(false)}
              onSave={updateTitle}
              editModeProps={{
                cancelButtonProps: { onClick: () => setEditTitleOpen(false) },
                formRowProps: { className: 'editModeFormRow ' },
              }}
              startWithEditOpen
              inputAriaLabel="Edit title inline"
            />
          </EuiFlexItem>
        ) : (
          <>
            <EuiFlexItem grow={false}>
              <EuiLink onClick={toggleIsCollapsed}>
                <EuiTitle size="xs">
                  <h2>{rowTitle}</h2>
                </EuiTitle>
              </EuiLink>
            </EuiFlexItem>
            {!readOnly && (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="pencil"
                  onClick={() => setEditTitleOpen(true)}
                  color="text"
                />
              </EuiFlexItem>
            )}
          </>
        )}
      </>
    );
  }
);

GridRowTitle.displayName = 'GridRowTitle';
