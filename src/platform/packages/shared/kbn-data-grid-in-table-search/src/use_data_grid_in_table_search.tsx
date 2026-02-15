/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { SerializedStyles } from '@emotion/react';
import useLatest from 'react-use/lib/useLatest';
import type { EuiDataGridProps, EuiDataGridRefProps } from '@elastic/eui';
import { useEuiTheme } from '@elastic/eui';
import { InTableSearchControl } from './in_table_search_control';
import { type InTableSearchProviderValue } from './in_table_search_context';
import type {
  InTableSearchControlProps,
  InTableSearchRestorableState,
  RenderCellValueWrapper,
  UseFindMatchesState,
} from './types';
import { wrapRenderCellValueWithInTableSearchSupport } from './wrap_render_cell_value';
import { clearSearchTermRegExpCache } from './in_table_search_highlights_wrapper';
import { getHighlightColors } from './get_highlight_colors';
import { getActiveMatchCss } from './get_active_match_css';
import { INITIAL_STATE as INITIAL_MATCH_STATE } from './matches/use_find_matches';

export interface UseDataGridInTableSearchProps
  extends Pick<InTableSearchControlProps, 'rows' | 'visibleColumns'> {
  enableInTableSearch?: boolean;
  dataGridWrapper: HTMLElement | null;
  dataGridRef: React.RefObject<EuiDataGridRefProps | null>;
  cellContext: EuiDataGridProps['cellContext'] | undefined;
  pagination: EuiDataGridProps['pagination'] | undefined;
  renderCellValue: EuiDataGridProps['renderCellValue'];
  initialState: MutableRefObject<InTableSearchRestorableState | undefined>;
  onInitialStateChange?: (initialState: InTableSearchRestorableState) => void;
}

export interface UseDataGridInTableSearchState {
  inTableSearchTerm: string;
  inTableSearchTermCss?: SerializedStyles;
}

export interface UseDataGridInTableSearchReturn {
  inTableSearchTermCss?: UseDataGridInTableSearchState['inTableSearchTermCss'];
  inTableSearchControl: React.JSX.Element | undefined;
  inTableSearchContextValue: InTableSearchProviderValue | null;
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
    () => currentInitialState?.current
  );
  const onInitialStateChangeRef = useLatest(currentOnInitialStateChange);
  const [onInitialStateChange] = useState(() => onInitialStateChangeRef.current);
  const [matchState, setMatchState] = useState<UseFindMatchesState>(INITIAL_MATCH_STATE);

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

  /**
   * Context value includes control props so all toolbar instances rendered in the same data grid share the same UI state (search term, matches count, etc).
   */
  const controlPropsContextValue = useMemo(():
    | InTableSearchProviderValue['controlPropsContextValue']
    | null => {
    if (!enableInTableSearch) return null;

    const controlsCount = dataGridWrapper
      ? dataGridWrapper.querySelectorAll('.euiDataGridHeaderCell--controlColumn').length
      : 0;

    return {
      initialState: currentInitialState,
      onInitialStateChange,
      inTableSearchTerm,
      visibleColumns,
      rows,
      renderCellValue: renderCellValueWithInTableSearchSupport,
      pageSize,
      getColumnIndexFromId: (columnId: string) => visibleColumns.indexOf(columnId) + controlsCount,
      scrollToCell: (params) => {
        dataGridRef.current?.scrollToItem?.(params);
      },
      shouldOverrideCmdF: (element: HTMLElement) => {
        if (!dataGridWrapper) return false;
        return dataGridWrapper.contains?.(element) ?? false;
      },
      onChange: (searchTerm) => {
        const nextSearchTerm = searchTerm || '';
        setInTableSearchState({ inTableSearchTerm: nextSearchTerm });
        if (!nextSearchTerm) {
          clearSearchTermRegExpCache();
        }
      },
      onChangeCss: (styles) =>
        setInTableSearchState((prevState) => ({ ...prevState, inTableSearchTermCss: styles })),
      onChangeToExpectedPage: (expectedPageIndex: number) => {
        if (isPaginationEnabled && pageIndexRef.current !== expectedPageIndex) {
          onChangePage?.(expectedPageIndex);
        }
      },
    };
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
    currentInitialState,
    onInitialStateChange,
  ]);

  const matchContextValue = useMemo(
    (): InTableSearchProviderValue['matchContextValue'] => ({
      matchState,
      setMatchState,
    }),
    [matchState, setMatchState]
  );

  const inTableSearchContextValue = useMemo(
    (): UseDataGridInTableSearchReturn['inTableSearchContextValue'] =>
      enableInTableSearch && controlPropsContextValue
        ? { controlPropsContextValue, matchContextValue }
        : null,
    [enableInTableSearch, controlPropsContextValue, matchContextValue]
  );

  /** exposes the in-table search control component */
  const inTableSearchControl = useMemo(() => {
    return <InTableSearchControl />;
  }, []);

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
      inTableSearchContextValue,
      cellContextWithInTableSearchSupport,
      renderCellValueWithInTableSearchSupport,
    }),
    [
      inTableSearchTermCss,
      inTableSearchControl,
      inTableSearchContextValue,
      cellContextWithInTableSearchSupport,
      renderCellValueWithInTableSearchSupport,
    ]
  );
};
