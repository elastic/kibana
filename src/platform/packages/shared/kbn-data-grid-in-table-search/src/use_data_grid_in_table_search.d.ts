import React from 'react';
import type { SerializedStyles } from '@emotion/react';
import type { EuiDataGridProps, EuiDataGridRefProps } from '@elastic/eui';
import type { InTableSearchControlProps } from './in_table_search_control';
import type { InTableSearchRestorableState, RenderCellValueWrapper } from './types';
export interface UseDataGridInTableSearchProps extends Pick<InTableSearchControlProps, 'rows' | 'visibleColumns'> {
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
    inTableSearchControl: React.JSX.Element | undefined;
    cellContextWithInTableSearchSupport: EuiDataGridProps['cellContext'];
    renderCellValueWithInTableSearchSupport: RenderCellValueWrapper;
}
export declare const useDataGridInTableSearch: (props: UseDataGridInTableSearchProps) => UseDataGridInTableSearchReturn;
