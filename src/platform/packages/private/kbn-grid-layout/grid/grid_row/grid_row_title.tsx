/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { cloneDeep } from 'lodash';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { distinctUntilChanged, map } from 'rxjs';

import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiTitle,
  UseEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { css } from '@emotion/react';
import { useGridLayoutContext } from '../use_grid_layout_context';

export const GridRowTitle = React.memo(
  ({
    readOnly,
    rowIndex,
    editTitleOpen,
    setEditTitleOpen,
    toggleIsCollapsed,
    collapseButtonRef,
  }: {
    readOnly: boolean;
    rowIndex: number;
    editTitleOpen: boolean;
    setEditTitleOpen: (value: boolean) => void;
    toggleIsCollapsed: () => void;
    collapseButtonRef: React.MutableRefObject<HTMLButtonElement | null>;
  }) => {
    const { gridLayoutStateManager } = useGridLayoutContext();

    const inputRef = useRef<HTMLInputElement | null>(null);
    const currentRow = gridLayoutStateManager.gridLayout$.getValue()[rowIndex];
    const [rowTitle, setRowTitle] = useState<string>(currentRow.title);

    useEffect(() => {
      /**
       * This subscription ensures that this component will re-render when the title changes
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

    useEffect(() => {
      /**
       * Set focus on title input when edit mode is open
       */
      if (editTitleOpen && inputRef.current) {
        inputRef.current.focus();
      }
    }, [editTitleOpen]);

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
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            buttonRef={collapseButtonRef}
            color="text"
            aria-label={i18n.translate('kbnGridLayout.row.toggleCollapse', {
              defaultMessage: 'Toggle collapse',
            })}
            iconType={'arrowDown'}
            onClick={toggleIsCollapsed}
            css={accordianButtonStyles}
            size="m"
            id={`kbnGridRowTitle-${rowIndex}`}
            aria-controls={`kbnGridRow-${rowIndex}`}
            data-test-subj={`kbnGridRowTitle-${rowIndex}`}
            textProps={false}
            flush="both"
          >
            {editTitleOpen ? null : (
              <EuiTitle size="xs">
                <h2>{rowTitle}</h2>
              </EuiTitle>
            )}
          </EuiButtonEmpty>
        </EuiFlexItem>
        {!readOnly && editTitleOpen ? (
          <EuiFlexItem grow={true}>
            {/* @ts-ignore - EUI typing issue that will be resolved with https://github.com/elastic/eui/pull/8307 */}
            <EuiInlineEditTitle
              size="xs"
              heading="h2"
              defaultValue={rowTitle}
              onSave={updateTitle}
              onCancel={() => setEditTitleOpen(false)}
              startWithEditOpen
              editModeProps={{
                inputProps: { inputRef },
              }}
              inputAriaLabel={i18n.translate('kbnGridLayout.row.editTitleAriaLabel', {
                defaultMessage: 'Edit section title',
              })}
              data-test-subj={`kbnGridRowTitle-${rowIndex}--editor`}
            />
          </EuiFlexItem>
        ) : (
          <>
            {!readOnly && (
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="pencil"
                  onClick={() => setEditTitleOpen(true)}
                  color="text"
                  aria-label={i18n.translate('kbnGridLayout.row.editRowTitle', {
                    defaultMessage: 'Edit section title',
                  })}
                  data-test-subj={`kbnGridRowTitle-${rowIndex}--edit`}
                />
              </EuiFlexItem>
            )}
          </>
        )}
      </>
    );
  }
);

const accordianButtonStyles = ({ euiTheme }: UseEuiTheme) =>
  css({
    '&:focus': {
      backgroundColor: 'unset',
    },
    svg: {
      transition: `transform ${euiTheme.animation.fast} ease`,
      transform: 'rotate(0deg)',
      '.kbnGridRowContainer--collapsed &': {
        transform: 'rotate(-90deg) !important',
      },
    },
  });

GridRowTitle.displayName = 'GridRowTitle';
