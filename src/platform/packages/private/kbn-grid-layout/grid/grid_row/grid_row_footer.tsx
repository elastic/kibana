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
import { cloneDeep } from 'lodash';

export interface GridRowFooterProps {
  rowIndex: number;
}

export const GridRowFooter = React.memo(({ rowIndex }: GridRowFooterProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const currentRow = gridLayoutStateManager.gridLayout$.getValue()[rowIndex];

  const [pageCount, setPageCount] = useState<number>(
    gridLayoutStateManager.gridLayout$.getValue().length
  );
  const [activeSectionIndex, setActiveSection] = useState<number | undefined>(
    gridLayoutStateManager.activeSection$.getValue()
  );
  const [rowTitle, setRowTitle] = useState<string>(currentRow.title);

  useEffect(() => {
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

  // const confirmDeleteRow = useCallback(() => {
  //   /**
  //    * Memoization of this callback does not need to be dependant on the React panel count
  //    * state, so just grab the panel count via gridLayoutStateManager instead
  //    */
  //   const count = Object.keys(
  //     gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels
  //   ).length;
  //   if (!Boolean(count)) {
  //     const newLayout = deleteRow(gridLayoutStateManager.gridLayout$.getValue(), rowIndex);
  //     gridLayoutStateManager.gridLayout$.next(newLayout);
  //   } else {
  //     setDeleteModalVisible(true);
  //   }
  // }, [gridLayoutStateManager.gridLayout$, rowIndex]);

  return (
    <EuiFlexGroup css={styles.footerStyles} alignItems="center" justifyContent="center">
      <EuiFlexItem grow={true}>
        {rowIndex !== 0 && (
          <EuiInlineEditTitle
            size="xs"
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
        <div>
          <EuiButtonIcon iconType="trash" color="danger" iconSize="m" size="m" onClick={() => {}} />
          <EuiButtonIcon iconType="plusInCircleFilled" color="text" iconSize="l" size="m" />
        </div>
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
