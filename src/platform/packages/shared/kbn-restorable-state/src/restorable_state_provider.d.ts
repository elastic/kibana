import type { SetStateAction } from 'react';
import React from 'react';
export interface RestorableStateProviderProps<TState extends object> {
    initialState?: Partial<TState>;
    onInitialStateChange?: (initialState: Partial<TState>) => void;
}
export interface RestorableStateProviderApi {
    refreshInitialState: () => void;
}
type InitialValue<TState extends object, TKey extends keyof TState> = TState[TKey] | (() => TState[TKey]);
type ShouldIgnoredRestoredValue<TState extends object, TKey extends keyof TState> = (restoredValue: TState[TKey]) => boolean;
export declare const createRestorableStateProvider: <TState extends object>() => {
    withRestorableState: <TComponent extends React.ComponentType<any>>(Component: TComponent) => React.ForwardRefExoticComponent<React.PropsWithoutRef<React.CustomComponentPropsWithRef<TComponent> & Pick<RestorableStateProviderProps<TState>, "initialState" | "onInitialStateChange">> & React.RefAttributes<React.ElementRef<TComponent> & RestorableStateProviderApi>>;
    useRestorableState: <TKey extends keyof TState>(key: TKey, initialValue: InitialValue<TState, TKey>, options?: {
        shouldIgnoredRestoredValue?: ShouldIgnoredRestoredValue<TState, TKey>;
        shouldStoreDefaultValueRightAway?: boolean;
    }) => readonly [TState[TKey], (value: SetStateAction<TState[TKey]>) => void];
    useRestorableRef: <TKey extends keyof TState>(key: TKey, initialValue: TState[TKey], options?: {
        shouldStoreDefaultValueRightAway?: boolean;
    }) => React.MutableRefObject<TState[TKey]>;
    useRestorableLocalStorage: <TKey extends keyof TState>(key: TKey, localStorageKey: string, initialValue: TState[TKey]) => readonly [TState[TKey], (value: SetStateAction<TState[TKey]>) => void];
};
export {};
