import type { FieldTypeKnown } from '@kbn/field-utils';
export interface UnifiedFieldListRestorableState {
    /**
     * Whether the field list is collapsed or expanded
     */
    isCollapsed: boolean;
    /**
     * Field search
     */
    nameFilter: string;
    /**
     * Field type filters
     */
    selectedFieldTypes: FieldTypeKnown[];
    /**
     * The number of actually rendered (visible) fields
     */
    pageSize: number;
    /**
     * Scroll position inside the field list
     */
    scrollTop: number;
    /**
     * Which sections of the field list are expanded
     */
    accordionState: Record<string, boolean>;
}
export declare const withRestorableState: <TComponent extends React.ComponentType<any>>(Component: TComponent) => import("react").ForwardRefExoticComponent<import("react").PropsWithoutRef<import("react").CustomComponentPropsWithRef<TComponent> & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<UnifiedFieldListRestorableState>, "initialState" | "onInitialStateChange">> & import("react").RefAttributes<import("react").ElementRef<TComponent> & import("@kbn/restorable-state").RestorableStateProviderApi>>, useRestorableState: <TKey extends keyof UnifiedFieldListRestorableState>(key: TKey, initialValue: UnifiedFieldListRestorableState[TKey] | (() => UnifiedFieldListRestorableState[TKey]), options?: {
    shouldIgnoredRestoredValue?: ((restoredValue: UnifiedFieldListRestorableState[TKey]) => boolean) | undefined;
    shouldStoreDefaultValueRightAway?: boolean;
} | undefined) => readonly [UnifiedFieldListRestorableState[TKey], (value: import("react").SetStateAction<UnifiedFieldListRestorableState[TKey]>) => void], useRestorableRef: <TKey extends keyof UnifiedFieldListRestorableState>(key: TKey, initialValue: UnifiedFieldListRestorableState[TKey], options?: {
    shouldStoreDefaultValueRightAway?: boolean;
} | undefined) => import("react").MutableRefObject<UnifiedFieldListRestorableState[TKey]>;
