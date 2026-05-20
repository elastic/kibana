import type { InTableSearchRestorableState } from '@kbn/data-grid-in-table-search/src/types';
import type { DocumentDiffMode } from './components/compare_documents/types';
import type { DataGridDensity } from './constants';
type SelectedDocId = string;
export interface UnifiedDataTableRestorableState {
    selectedDocsMap: Record<SelectedDocId, boolean>;
    isFilterActive: boolean;
    pageIndex: number;
    inTableSearch?: InTableSearchRestorableState;
    isCompareActive: boolean;
    comparisonSettingShowDiff: boolean;
    comparisonSettingShowDiffDecorations: boolean;
    comparisonSettingShowAllFields: boolean;
    comparisonSettingShowMatchingValues: boolean;
    comparisonSettingDiffMode: DocumentDiffMode;
    density: DataGridDensity;
    rowHeight: number;
    headerRowHeight: number;
}
export declare const withRestorableState: <TComponent extends React.ComponentType<any>>(Component: TComponent) => import("react").ForwardRefExoticComponent<import("react").PropsWithoutRef<import("react").CustomComponentPropsWithRef<TComponent> & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<UnifiedDataTableRestorableState>, "initialState" | "onInitialStateChange">> & import("react").RefAttributes<import("react").ElementRef<TComponent> & import("@kbn/restorable-state").RestorableStateProviderApi>>, useRestorableState: <TKey extends keyof UnifiedDataTableRestorableState>(key: TKey, initialValue: UnifiedDataTableRestorableState[TKey] | (() => UnifiedDataTableRestorableState[TKey]), options?: {
    shouldIgnoredRestoredValue?: ((restoredValue: UnifiedDataTableRestorableState[TKey]) => boolean) | undefined;
    shouldStoreDefaultValueRightAway?: boolean;
} | undefined) => readonly [UnifiedDataTableRestorableState[TKey], (value: import("react").SetStateAction<UnifiedDataTableRestorableState[TKey]>) => void], useRestorableRef: <TKey extends keyof UnifiedDataTableRestorableState>(key: TKey, initialValue: UnifiedDataTableRestorableState[TKey], options?: {
    shouldStoreDefaultValueRightAway?: boolean;
} | undefined) => import("react").MutableRefObject<UnifiedDataTableRestorableState[TKey]>, useRestorableLocalStorage: <TKey extends keyof UnifiedDataTableRestorableState>(key: TKey, localStorageKey: string, initialValue: UnifiedDataTableRestorableState[TKey]) => readonly [UnifiedDataTableRestorableState[TKey], (value: import("react").SetStateAction<UnifiedDataTableRestorableState[TKey]>) => void];
export {};
