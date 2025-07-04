/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { SerializedStyles } from '@emotion/react';
import { EuiDataGridProps, EuiDataGridRefProps, useEuiTheme } from '@elastic/eui';
import { InTableSearchControl, InTableSearchControlProps } from './in_table_search_control';
import { RenderCellValueWrapper } from './types';
import { wrapRenderCellValueWithInTableSearchSupport } from './wrap_render_cell_value';
import { clearSearchTermRegExpCache } from './in_table_search_highlights_wrapper';
import { getHighlightColors } from './get_highlight_colors';

export interface UseDataGridInTableSearchProps
  extends Pick<InTableSearchControlProps, 'rows' | 'visibleColumns'> {
  enableInTableSearch?: boolean;
  dataGridWrapper: HTMLElement | null;
  dataGridRef: React.RefObject<EuiDataGridRefProps | null>;
  cellContext: EuiDataGridProps['cellContext'] | undefined;
  pagination: EuiDataGridProps['pagination'] | undefined;
  renderCellValue: EuiDataGridProps['renderCellValue'];
}

export interface UseDataGridInTableSearchState {
  inTableSearchTerm: string;
  inTableSearchTermCss?: SerializedStyles;
}

export interface UseDataGridInTableSearchReturn {
  inTableSearchTermCss?: UseDataGridInTableSearchState['inTableSearchTermCss'];
  inTableSearchControl: React.JSX.Element | undefined;
  cellContextWithInTableSearchSupport: EuiDataGridProps['cellContext'];
  renderCellValueWithInTableSearchSupport: RenderCellValueWrapper;
}

export const useDataGridInTableSearch = (
  props: UseDataGridInTableSearchProps
): UseDataGridInTableSearchReturn => {
  const {
    enableInTableSearch = true,
    dataGridWrapper,
    dataGridRef,
    visibleColumns,
    rows,
    renderCellValue,
    pagination,
    cellContext,
  } = props;
  const { euiTheme } = useEuiTheme();
  const isPaginationEnabled = Boolean(pagination);
  const pageSize = (isPaginationEnabled && pagination?.pageSize) || null;
  const onChangePage = pagination?.onChangePage;
  const pageIndexRef = useRef<number>();
  pageIndexRef.current = pagination?.pageIndex ?? 0;

  const renderCellValueWithInTableSearchSupport = useMemo(() => {
    const colors = getHighlightColors(euiTheme);

    return wrapRenderCellValueWithInTableSearchSupport(
      renderCellValue,
      // defines colors for the highlights
      colors.highlightColor,
      colors.highlightBackgroundColor
    );
  }, [renderCellValue, euiTheme]);

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
        renderCellValue={renderCellValueWithInTableSearchSupport}
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
        onChange={(searchTerm) => {
          const nextSearchTerm = searchTerm || '';
          setInTableSearchState({ inTableSearchTerm: nextSearchTerm });
          if (!nextSearchTerm) {
            clearSearchTermRegExpCache();
          }
        }}
        onChangeCss={(styles) =>
          setInTableSearchState((prevState) => ({ ...prevState, inTableSearchTermCss: styles }))
        }
        onChangeToExpectedPage={(expectedPageIndex: number) => {
          if (isPaginationEnabled && pageIndexRef.current !== expectedPageIndex) {
            onChangePage?.(expectedPageIndex);
          }
        }}
      />
    );
  }, [
    enableInTableSearch,
    setInTableSearchState,
    visibleColumns,
    rows,
    renderCellValueWithInTableSearchSupport,
    dataGridRef,
    dataGridWrapper,
    inTableSearchTerm,
    isPaginationEnabled,
    pageSize,
    onChangePage,
  ]);

  const cellContextWithInTableSearchSupport: EuiDataGridProps['cellContext'] = useMemo(() => {
    if (!inTableSearchTerm && !cellContext) {
      return undefined;
    }

    return {
      ...cellContext,
      inTableSearchTerm,
    };
  }, [cellContext, inTableSearchTerm]);

  useEffect(() => {
    return () => {
      clearSearchTermRegExpCache();
    };
  }, []);

  return useMemo(
    () => ({
      inTableSearchTermCss,
      inTableSearchControl,
      cellContextWithInTableSearchSupport,
      renderCellValueWithInTableSearchSupport,
    }),
    [
      inTableSearchTermCss,
      inTableSearchControl,
      cellContextWithInTableSearchSupport,
      renderCellValueWithInTableSearchSupport,
    ]
  );
};
