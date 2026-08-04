import type { HistoryTabId } from './types';
export interface ESQLEditorRestorableState {
    editorHeight: number;
    resizableContainerHeight: number;
    isHistoryOpen: boolean;
    historySelectedTabId: HistoryTabId;
    isVisorOpen: boolean;
}
export declare const withRestorableState: <TComponent extends React.ComponentType<any>>(Component: TComponent) => import("react").ForwardRefExoticComponent<import("react").PropsWithoutRef<import("react").CustomComponentPropsWithRef<TComponent> & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<ESQLEditorRestorableState>, "initialState" | "onInitialStateChange">> & import("react").RefAttributes<import("react").ElementRef<TComponent> & import("@kbn/restorable-state").RestorableStateProviderApi>>, useRestorableState: <TKey extends keyof ESQLEditorRestorableState>(key: TKey, initialValue: ESQLEditorRestorableState[TKey] | (() => ESQLEditorRestorableState[TKey]), options?: {
    shouldIgnoredRestoredValue?: ((restoredValue: ESQLEditorRestorableState[TKey]) => boolean) | undefined;
    shouldStoreDefaultValueRightAway?: boolean;
} | undefined) => readonly [ESQLEditorRestorableState[TKey], (value: import("react").SetStateAction<ESQLEditorRestorableState[TKey]>) => void], useRestorableRef: <TKey extends keyof ESQLEditorRestorableState>(key: TKey, initialValue: ESQLEditorRestorableState[TKey], options?: {
    shouldStoreDefaultValueRightAway?: boolean;
} | undefined) => import("react").MutableRefObject<ESQLEditorRestorableState[TKey]>;
