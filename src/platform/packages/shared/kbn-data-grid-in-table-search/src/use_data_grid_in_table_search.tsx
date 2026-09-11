/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SerializedStyles } from '@emotion/react';
import useLatest from 'react-use/lib/useLatest';
import type { EuiDataGridProps, EuiDataGridRefProps } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import type { UseInTableSearchControlProps } from './in_table_search_control';
import { useInTableSearchControl } from './in_table_search_control';
import type { InTableSearchRestorableState, RenderCellValueWrapper } from './types';
import { wrapRenderCellValueWithInTableSearchSupport } from './wrap_render_cell_value';
import { clearSearchTermRegExpCache } from './in_table_search_highlights_wrapper';
import { getHighlightColors } from './get_highlight_colors';
import { getActiveMatchCss } from './get_active_match_css';

export interface UseDataGridInTableSearchProps
  extends Pick<UseInTableSearchControlProps, 'rows' | 'visibleColumns'> {
  enableInTableSearch?: boolean;
  dataGridWrapper: HTMLElement | null;
  dataGridRef: React.RefObject<EuiDataGridRefProps | null>;
  cellContext: EuiDataGridProps['cellContext'] | undefined;
  pagination: EuiDataGridProps['pagination'] | undefined;
  renderCellValue: EuiDataGridProps['renderCellValue'];
  initialState?: InTableSearchRestorableState;
  onInitialStateChange?: (initialState: InTableSearchRestorableState) => void;
}

export interface UseDataGridInTableSearchState {
  inTableSearchTerm: string;
  inTableSearchTermCss?: SerializedStyles;
}

export interface UseDataGridInTableSearchReturn {
  inTableSearchTermCss?: UseDataGridInTableSearchState['inTableSearchTermCss'];
  inTableSearchControl: React.ReactNode;
  inTableSearchButton: React.ReactNode;
  inTableSearchInput: React.ReactNode;
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
    initialState: currentInitialState,
    onInitialStateChange: currentOnInitialStateChange,
  } = props;
  const { euiTheme } = useEuiTheme();
  const isPaginationEnabled = Boolean(pagination);
  const pageSize = (isPaginationEnabled && pagination?.pageSize) || null;
  const onChangePage = pagination?.onChangePage;
  const pageIndexRef = useRef<number>();
  pageIndexRef.current = pagination?.pageIndex ?? 0;
  const [initialState] = useState<InTableSearchRestorableState | undefined>(
    () => currentInitialState
  );
  const onInitialStateChangeRef = useLatest(currentOnInitialStateChange);
  const [onInitialStateChange] = useState(() => onInitialStateChangeRef.current);

  const renderCellValueWithInTableSearchSupport = useMemo(() => {
    const colors = getHighlightColors(euiTheme);

    return wrapRenderCellValueWithInTableSearchSupport(
      renderCellValue,
      colors.highlightColor,
      colors.highlightBackgroundColor
    );
  }, [renderCellValue, euiTheme]);

  const [{ inTableSearchTerm, inTableSearchTermCss }, setInTableSearchState] =
    useState<UseDataGridInTableSearchState>(() => ({
      inTableSearchTerm: initialState?.searchTerm || '',
      inTableSearchTermCss:
        initialState?.searchTerm && initialState?.activeMatch
          ? getActiveMatchCss({
              activeMatch: initialState.activeMatch,
              colors: getHighlightColors(euiTheme),
            })
          : undefined,
    }));

  const controlsCount = useMemo(
    () =>
      dataGridWrapper
        ? dataGridWrapper.querySelectorAll('.euiDataGridHeaderCell--controlColumn').length
        : 0,
    [dataGridWrapper]
  );

  const getColumnIndexFromId = useCallback(
    (columnId: string) => visibleColumns.indexOf(columnId) + controlsCount,
    [visibleColumns, controlsCount]
  );

  const scrollToCell = useCallback(
    (params: { rowIndex: number; columnIndex: number; align: 'center' }) => {
      dataGridRef.current?.scrollToItem?.(params);
    },
    [dataGridRef]
  );

  const shouldOverrideCmdF = useCallback(
    (element: HTMLElement) => dataGridWrapper?.contains(element) ?? false,
    [dataGridWrapper]
  );

  const onChange = useCallback(
    (searchTerm: string | undefined) => {
      const nextSearchTerm = searchTerm || '';
      setInTableSearchState({ inTableSearchTerm: nextSearchTerm });
      if (!nextSearchTerm) {
        clearSearchTermRegExpCache();
      }
    },
    [setInTableSearchState]
  );

  const onChangeCss = useCallback(
    (styles: SerializedStyles) =>
      setInTableSearchState((prevState) => ({ ...prevState, inTableSearchTermCss: styles })),
    [setInTableSearchState]
  );

  const onChangeToExpectedPage = useCallback(
    (expectedPageIndex: number) => {
      if (isPaginationEnabled && pageIndexRef.current !== expectedPageIndex) {
        onChangePage?.(expectedPageIndex);
      }
    },
    [isPaginationEnabled, onChangePage]
  );

  const {
    searchButton: inTableSearchButton,
    searchInput: inTableSearchInput,
    isInputVisible,
  } = useInTableSearchControl({
    enabled: enableInTableSearch,
    initialState,
    onInitialStateChange,
    inTableSearchTerm,
    visibleColumns,
    rows,
    renderCellValue: renderCellValueWithInTableSearchSupport,
    pageSize,
    getColumnIndexFromId,
    scrollToCell,
    shouldOverrideCmdF,
    onChange,
    onChangeCss,
    onChangeToExpectedPage,
  });

  // For the non-custom-toolbar case: show either the button or input, not both
  const inTableSearchControl = enableInTableSearch
    ? isInputVisible
      ? inTableSearchInput
      : inTableSearchButton
    : undefined;

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
      inTableSearchButton,
      inTableSearchInput,
      cellContextWithInTableSearchSupport,
      renderCellValueWithInTableSearchSupport,
    }),
    [
      inTableSearchTermCss,
      inTableSearchControl,
      inTableSearchButton,
      inTableSearchInput,
      cellContextWithInTableSearchSupport,
      renderCellValueWithInTableSearchSupport,
    ]
  );
};
