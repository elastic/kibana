import React from 'react';
import type { DocViewRenderProps } from '@kbn/unified-doc-viewer/types';
export interface DocViewerTableRestorableState {
    searchTerm: string;
    fieldTypeFilters: string[];
    hideNullValues: boolean;
    showOnlySelectedFields: boolean;
    pinnedFields: string[];
    rowsPerPage: number;
    pageNumber: number;
    scrollTop: number;
}
export declare const withRestorableState: <TComponent extends React.ComponentType<any>>(Component: TComponent) => React.ForwardRefExoticComponent<React.PropsWithoutRef<React.CustomComponentPropsWithRef<TComponent> & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<DocViewerTableRestorableState>, "initialState" | "onInitialStateChange">> & React.RefAttributes<React.ElementRef<TComponent> & import("@kbn/restorable-state").RestorableStateProviderApi>>, useRestorableState: <TKey extends keyof DocViewerTableRestorableState>(key: TKey, initialValue: DocViewerTableRestorableState[TKey] | (() => DocViewerTableRestorableState[TKey]), options?: {
    shouldIgnoredRestoredValue?: ((restoredValue: DocViewerTableRestorableState[TKey]) => boolean) | undefined;
    shouldStoreDefaultValueRightAway?: boolean;
} | undefined) => readonly [DocViewerTableRestorableState[TKey], (value: React.SetStateAction<DocViewerTableRestorableState[TKey]>) => void], useRestorableRef: <TKey extends keyof DocViewerTableRestorableState>(key: TKey, initialValue: DocViewerTableRestorableState[TKey], options?: {
    shouldStoreDefaultValueRightAway?: boolean;
} | undefined) => React.MutableRefObject<DocViewerTableRestorableState[TKey]>, useRestorableLocalStorage: <TKey extends keyof DocViewerTableRestorableState>(key: TKey, localStorageKey: string, initialValue: DocViewerTableRestorableState[TKey]) => readonly [DocViewerTableRestorableState[TKey], (value: React.SetStateAction<DocViewerTableRestorableState[TKey]>) => void];
export declare const HIDE_NULL_VALUES = "unifiedDocViewer:hideNullValues";
export declare const SHOW_ONLY_SELECTED_FIELDS = "unifiedDocViewer:showOnlySelectedFields";
export declare const DocViewerTable: React.ForwardRefExoticComponent<DocViewRenderProps & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<DocViewerTableRestorableState>, "initialState" | "onInitialStateChange"> & React.RefAttributes<never>>;
