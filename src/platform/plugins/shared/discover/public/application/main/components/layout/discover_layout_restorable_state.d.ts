export interface DiscoverLayoutRestorableState {
    sidebarWidth: number;
}
export declare const withRestorableState: <TComponent extends React.ComponentType<any>>(Component: TComponent) => import("react").ForwardRefExoticComponent<import("react").PropsWithoutRef<import("react").CustomComponentPropsWithRef<TComponent> & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<DiscoverLayoutRestorableState>, "initialState" | "onInitialStateChange">> & import("react").RefAttributes<import("react").ElementRef<TComponent> & import("@kbn/restorable-state").RestorableStateProviderApi>>, useRestorableState: <TKey extends "sidebarWidth">(key: TKey, initialValue: DiscoverLayoutRestorableState[TKey] | (() => DiscoverLayoutRestorableState[TKey]), options?: {
    shouldIgnoredRestoredValue?: ((restoredValue: DiscoverLayoutRestorableState[TKey]) => boolean) | undefined;
    shouldStoreDefaultValueRightAway?: boolean;
} | undefined) => readonly [DiscoverLayoutRestorableState[TKey], (value: import("react").SetStateAction<DiscoverLayoutRestorableState[TKey]>) => void];
