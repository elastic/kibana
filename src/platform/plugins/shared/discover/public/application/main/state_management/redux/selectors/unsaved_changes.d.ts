import type { DiscoverSessionTab } from '@kbn/saved-search-plugin/common';
import { type RuntimeStateManager } from '../runtime_state';
import type { DiscoverInternalState } from '../types';
import type { DiscoverServices } from '../../../../../build_services';
export interface HasUnsavedChangesResult {
    hasUnsavedChanges: boolean;
    unsavedTabIds: string[];
}
export declare const selectHasUnsavedChanges: (state: DiscoverInternalState, { runtimeStateManager, services, }: {
    runtimeStateManager: RuntimeStateManager;
    services: DiscoverServices;
}) => HasUnsavedChangesResult;
type FieldComparator<T> = (a: T, b: T) => boolean;
type TabComparators = {
    [K in keyof DiscoverSessionTab]-?: FieldComparator<DiscoverSessionTab[K]>;
};
export declare const searchSourceComparator: TabComparators['serializedSearchSource'];
export {};
