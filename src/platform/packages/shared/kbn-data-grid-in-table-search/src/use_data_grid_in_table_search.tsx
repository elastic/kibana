/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import type { SerializedStyles } from '@emotion/react';
import type { EuiDataGridProps, EuiDataGridRefProps } from '@elastic/eui';
import { InTableSearchControl } from './in_table_search_control';
import { InTableSearchControlProps } from './in_table_search_control';

export interface UseDataGridInTableSearchProps
  extends Pick<
    InTableSearchControlProps,
    'rows' | 'visibleColumns' | 'renderCellValue' | 'pageSize' | 'onChangeToExpectedPage'
  > {
  enableInTableSearch?: boolean;
  dataGridWrapper: HTMLElement | null;
  dataGridRef: React.RefObject<EuiDataGridRefProps>;
  cellContext: EuiDataGridProps['cellContext'] | undefined;
}

export interface UseDataGridInTableSearchState {
  inTableSearchTerm: string;
  inTableSearchTermCss?: SerializedStyles;
}

export interface UseDataGridInTableSearchReturn {
  inTableSearchTermCss?: UseDataGridInTableSearchState['inTableSearchTermCss'];
  inTableSearchControl: React.JSX.Element | undefined;
  extendedCellContext: EuiDataGridProps['cellContext'];
}

export const useDataGridInTableSearch = (
  props: UseDataGridInTableSearchProps
): UseDataGridInTableSearchReturn => {
  const {
    enableInTableSearch,
    dataGridWrapper,
    dataGridRef,
    visibleColumns,
    rows,
    renderCellValue,
    pageSize,
    cellContext,
    onChangeToExpectedPage,
  } = props;
  const [{ inTableSearchTerm, inTableSearchTermCss }, setInTableSearchState] =
    useState<UseDataGridInTableSearchState>(() => ({ inTableSearchTerm: '' }));

  const inTableSearchControl = useMemo(() => {
    if (!enableInTableSearch) {
      return undefined;
    }
    const controlsCount = dataGridWrapper
      ? dataGridWrapper.querySelectorAll('.euiDataGridHeaderCell--controlColumn').length
      : 0;
    return (
      <InTableSearchControl
        inTableSearchTerm={inTableSearchTerm}
        visibleColumns={visibleColumns}
        rows={rows}
        renderCellValue={renderCellValue}
        pageSize={pageSize}
        getColumnIndexFromId={(columnId) => visibleColumns.indexOf(columnId) + controlsCount}
        scrollToCell={(params) => {
          dataGridRef.current?.scrollToItem?.(params);
        }}
        shouldOverrideCmdF={(element) => {
          if (!dataGridWrapper) {
            return false;
          }
          return dataGridWrapper.contains?.(element) ?? false;
        }}
        onChange={(searchTerm) => setInTableSearchState({ inTableSearchTerm: searchTerm || '' })}
        onChangeCss={(styles) =>
          setInTableSearchState((prevState) => ({ ...prevState, inTableSearchTermCss: styles }))
        }
        onChangeToExpectedPage={onChangeToExpectedPage}
      />
    );
  }, [
    enableInTableSearch,
    setInTableSearchState,
    visibleColumns,
    rows,
    renderCellValue,
    dataGridRef,
    dataGridWrapper,
    inTableSearchTerm,
    pageSize,
    onChangeToExpectedPage,
  ]);

  const extendedCellContext: EuiDataGridProps['cellContext'] = useMemo(() => {
    if (!inTableSearchTerm && !cellContext) {
      return undefined;
    }

    return {
      ...cellContext,
      inTableSearchTerm,
    };
  }, [cellContext, inTableSearchTerm]);

  return useMemo(
    () => ({ inTableSearchTermCss, inTableSearchControl, extendedCellContext }),
    [inTableSearchTermCss, inTableSearchControl, extendedCellContext]
  );
};
