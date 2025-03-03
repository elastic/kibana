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
    rowId,
    editTitleOpen,
    setEditTitleOpen,
    toggleIsCollapsed,
    collapseButtonRef,
  }: {
    readOnly: boolean;
    rowId: string;
    editTitleOpen: boolean;
    setEditTitleOpen: (value: boolean) => void;
    toggleIsCollapsed: () => void;
    collapseButtonRef: React.MutableRefObject<HTMLButtonElement | null>;
  }) => {
    const { gridLayoutStateManager } = useGridLayoutContext();

    const inputRef = useRef<HTMLInputElement | null>(null);
    const currentRow = gridLayoutStateManager.gridLayout$.getValue()[rowId];
    const [rowTitle, setRowTitle] = useState<string>(currentRow.title);

    useEffect(() => {
      /**
       * This subscription ensures that this component will re-render when the title changes
       */
      const titleSubscription = gridLayoutStateManager.gridLayout$
        .pipe(
          map((gridLayout) => gridLayout[rowId]?.title ?? ''),
          distinctUntilChanged()
        )
        .subscribe((title) => {
          setRowTitle(title);
        });

      return () => {
        titleSubscription.unsubscribe();
      };
    }, [rowId, gridLayoutStateManager]);

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
        newLayout[rowId].title = title;
        gridLayoutStateManager.gridLayout$.next(newLayout);
        setEditTitleOpen(false);
      },
      [rowId, setEditTitleOpen, gridLayoutStateManager.gridLayout$]
    );

    return (
      <>
        <EuiFlexItem grow={false} css={styles.titleButton}>
          <EuiButtonEmpty
            buttonRef={collapseButtonRef}
            color="text"
            aria-label={i18n.translate('kbnGridLayout.row.toggleCollapse', {
              defaultMessage: 'Toggle collapse',
            })}
            iconType={'arrowDown'}
            onClick={toggleIsCollapsed}
            size="m"
            id={`kbnGridRowTitle-${rowId}`}
            aria-controls={`kbnGridRow-${rowId}`}
            data-test-subj={`kbnGridRowTitle-${rowId}`}
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
          <EuiFlexItem grow={true} css={styles.editTitleInput}>
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
              data-test-subj={`kbnGridRowTitle-${rowId}--editor`}
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
                  data-test-subj={`kbnGridRowTitle-${rowId}--edit`}
                />
              </EuiFlexItem>
            )}
          </>
        )}
      </>
    );
  }
);

const styles = {
  titleButton: ({ euiTheme }: UseEuiTheme) =>
    css({
      minWidth: 0,
      button: {
        '&:focus': {
          backgroundColor: 'unset',
        },
        h2: {
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
        svg: {
          transition: `transform ${euiTheme.animation.fast} ease`,
          transform: 'rotate(0deg)',
          '.kbnGridRowContainer--collapsed &': {
            transform: 'rotate(-90deg) !important',
          },
        },
      },
    }),
  editTitleInput: css({
    // if field-sizing is supported, grow width to text; otherwise, fill available space
    '@supports (field-sizing: content)': {
      minWidth: 0,
      '.euiFlexItem:has(input)': {
        flexGrow: 0,
        maxWidth: 'calc(100% - 80px)', // don't extend past parent
      },
      input: {
        fieldSizing: 'content',
      },
    },
  }),
};

GridRowTitle.displayName = 'GridRowTitle';
