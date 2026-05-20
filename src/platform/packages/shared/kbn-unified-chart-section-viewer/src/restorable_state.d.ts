import type { Dimension } from './types';
export type FlyoutTabId = 'overview' | 'esql-query';
export interface FlyoutState {
    readonly gridPosition: number;
    readonly metricUniqueKey: string;
    readonly esqlQuery: string;
    readonly selectedTabId?: FlyoutTabId;
}
export interface MetricsExperienceRestorableState {
    currentPage: number;
    searchTerm: string;
    isFullscreen: boolean;
    selectedDimensions: Dimension[];
    flyoutState?: FlyoutState;
}
export interface TracesRestorableState {
}
export type UnifiedMetricsGridRestorableState = MetricsExperienceRestorableState | TracesRestorableState;
export declare const withRestorableState: <TComponent extends React.ComponentType<any>>(Component: TComponent) => import("react").ForwardRefExoticComponent<import("react").PropsWithoutRef<import("react").CustomComponentPropsWithRef<TComponent> & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<MetricsExperienceRestorableState>, "initialState" | "onInitialStateChange">> & import("react").RefAttributes<import("react").ElementRef<TComponent> & import("@kbn/restorable-state").RestorableStateProviderApi>>, useRestorableState: <TKey extends keyof MetricsExperienceRestorableState>(key: TKey, initialValue: MetricsExperienceRestorableState[TKey] | (() => MetricsExperienceRestorableState[TKey]), options?: {
    shouldIgnoredRestoredValue?: ((restoredValue: MetricsExperienceRestorableState[TKey]) => boolean) | undefined;
    shouldStoreDefaultValueRightAway?: boolean;
} | undefined) => readonly [MetricsExperienceRestorableState[TKey], (value: import("react").SetStateAction<MetricsExperienceRestorableState[TKey]>) => void];
