import type { ReactNode } from 'react';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
export interface RowMatches {
    rowIndex: number;
    rowMatchesCount: number;
    matchesCountPerColumnId: Record<string, number>;
}
export interface ActiveMatch {
    rowIndex: number;
    columnId: string;
    matchIndexWithinCell: number;
    matchPosition: number;
}
export interface InTableSearchHighlightsWrapperProps {
    inTableSearchTerm?: string;
    highlightColor: string;
    highlightBackgroundColor: string;
    onHighlightsCountFound?: (count: number) => void;
    children: ReactNode;
}
export type RenderCellValuePropsWithInTableSearch = EuiDataGridCellValueElementProps & Pick<InTableSearchHighlightsWrapperProps, 'inTableSearchTerm' | 'onHighlightsCountFound'>;
export type RenderCellValueWrapper = (props: RenderCellValuePropsWithInTableSearch) => ReactNode;
export interface InTableSearchRestorableState {
    searchTerm?: string;
    activeMatch?: ActiveMatch;
}
export interface UseFindMatchesProps {
    initialState: InTableSearchRestorableState | undefined;
    onInitialStateChange: ((state: InTableSearchRestorableState) => void) | undefined;
    inTableSearchTerm: string;
    visibleColumns: string[];
    rows: unknown[];
    renderCellValue: RenderCellValueWrapper;
    onScrollToActiveMatch: (activeMatch: ActiveMatch, animate: boolean) => void;
}
export interface UseFindMatchesState {
    term: string;
    matchesList: RowMatches[];
    matchesCount: number | null;
    activeMatchPosition: number | null;
    columns: string[];
    isProcessing: boolean;
    renderCellsShadowPortal: (() => ReactNode) | null;
}
export interface UseFindMatchesReturn extends Omit<UseFindMatchesState, 'matchesList' | 'columns' | 'term'> {
    goToPrevMatch: () => void;
    goToNextMatch: () => void;
    resetState: () => void;
}
export type AllCellsProps = Pick<UseFindMatchesProps, 'renderCellValue' | 'visibleColumns' | 'inTableSearchTerm'> & {
    rowsCount: number;
    onFinish: (params: {
        term: string;
        matchesList: RowMatches[];
        totalMatchesCount: number;
    }) => void;
};
