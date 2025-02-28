/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React, { useCallback, useEffect, useState } from 'react';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiInlineEditTitle,
  EuiPagination,
  UseEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import { cloneDeep } from 'lodash';
import { useGridLayoutContext } from '../use_grid_layout_context';

export interface GridRowFooterProps {
  rowIndex: number;
  confirmDeleteRow: () => void;
}

export const GridRowFooter = React.memo(({ rowIndex, confirmDeleteRow }: GridRowFooterProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const currentRow = gridLayoutStateManager.gridLayout$.getValue()[rowIndex];

  const [pageCount, setPageCount] = useState<number>(
    gridLayoutStateManager.gridLayout$.getValue().length
  );
  const [activeSectionIndex, setActiveSection] = useState<number | undefined>(
    gridLayoutStateManager.activeSection$.getValue()
  );
  const [rowTitle, setRowTitle] = useState<string>(currentRow.title);
  const [readOnly, setReadOnly] = useState<boolean>(
    gridLayoutStateManager.accessMode$.getValue() === 'VIEW'
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

    const sectionSubscription = combineLatest([
      gridLayoutStateManager.gridLayout$,
      gridLayoutStateManager.activeSection$,
    ]).subscribe(([gridLayout, activeSection]) => {
      setActiveSection(activeSection);
      setPageCount(gridLayout.length);
    });

    const titleSubscription = gridLayoutStateManager.gridLayout$
      .pipe(
        map((gridLayout) => (rowIndex === 0 ? 'Main page' : gridLayout[rowIndex]?.title ?? '')),
        distinctUntilChanged()
      )
      .subscribe((title) => {
        setRowTitle(title);
      });
    return () => {
      accessModeSubscription.unsubscribe();
      sectionSubscription.unsubscribe();
      titleSubscription.unsubscribe();
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

  const addNewSection = useCallback(() => {
    gridLayoutStateManager.gridLayout$.next([
      ...gridLayoutStateManager.gridLayout$.getValue(),
      {
        title: i18n.translate('examples.gridExample.defaultSectionTitle', {
          defaultMessage: 'New collapsible section',
        }),
        isCollapsed: false,
        panels: {},
      },
    ]);
    if (gridLayoutStateManager.runtimeSettings$.getValue() === 'none') {
      gridLayoutStateManager.activeSection$.next(
        gridLayoutStateManager.gridLayout$.getValue().length - 1
      );
    }
  }, [gridLayoutStateManager]);

  return (
    <EuiFlexGroup css={styles.footerStyles} alignItems="center" justifyContent="center">
      <EuiFlexItem grow={true}>
        {rowIndex !== 0 && (
          <EuiInlineEditTitle
            size="xs"
            isReadOnly={readOnly}
            heading="h2"
            defaultValue={rowTitle}
            onSave={updateTitle}
            inputAriaLabel={i18n.translate('kbnGridLayout.row.editTitleAriaLabel', {
              defaultMessage: 'Edit section title',
            })}
            data-test-subj={`kbnGridRowTitle-${rowIndex}--editor`}
          />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={true} css={styles.floatMiddle}>
        <EuiPagination
          aria-label="Many pages example"
          pageCount={pageCount}
          activePage={activeSectionIndex}
          onPageClick={(activePage) => {
            gridLayoutStateManager.activeSection$.next(activePage);
          }}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        {!readOnly && (
          <div>
            {rowIndex !== 0 && (
              <EuiButtonIcon
                iconType="trash"
                color="danger"
                iconSize="m"
                size="s"
                onClick={confirmDeleteRow}
              />
            )}
            <EuiButtonIcon
              iconType="plusInCircleFilled"
              color="text"
              iconSize="m"
              size="s"
              onClick={addNewSection}
            />
          </div>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

const styles = {
  floatMiddle: css({
    alignItems: 'center',
  }),
  footerStyles: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flex: 0,
      minHeight: euiTheme.size.xxxxl,
      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
      borderTop: `${euiTheme.border.thin}`,
      padding: '12px',
      zIndex: 10000,
      '& div:first-child > div': {
        marginRight: 'auto',
      },
      '& div:last-child > div': {
        marginLeft: 'auto',
      },
    }),
};

GridRowFooter.displayName = 'GridRowFooter';
