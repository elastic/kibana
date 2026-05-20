import type { Row } from '@tanstack/react-table';
import { type GroupNode, type LeafNode, type IStoreState } from '../../../store_provider';
import { type UseVirtualizerReturnType } from '../virtualizer';
import type { ChildVirtualizerController, ConnectedChildState } from '../virtualizer/child_virtualizer_controller';
/**
 * Snapshot of data cascade ui state for use with useSyncExternalStore.
 * Includes virtualizer-derived state and specific table state.
 */
export interface DataCascadeUISnapshot<G extends GroupNode = GroupNode, L extends LeafNode = LeafNode> extends Pick<IStoreState<G, L>['table'], 'expanded' | 'rowSelection'> {
    scrollRect: {
        width: number;
        height: number;
    };
    scrollOffset: number;
    range: {
        startIndex: number;
        endIndex: number;
    } | null;
    isScrolling: boolean;
    activeStickyIndex: number | null;
    totalRowCount: number;
    totalSize: number;
    /**
     * The index of the topmost virtual item that is currently in view,
     * value is a derivative of the virtualizer's current scroll offset.
     */
    scrollAnchorItemIndex: number | null;
    /**
     * State of all child virtualizers connected via the controller.
     * Empty when no children are connected.
     */
    connectedChildren: Readonly<Record<string, ConnectedChildState>>;
}
/**
 * useSyncExternalStore-compatible store for data cascade ui state.
 */
export interface DataCascadeUISnapshotStore<G extends GroupNode, L extends LeafNode> {
    subscribe(onStoreChange: () => void): () => void;
    getSnapshot(): DataCascadeUISnapshot<G, L>;
    getServerSnapshot(): DataCascadeUISnapshot<G, L>;
}
/**
 * Options for useExposePublicApi. Supplies table/UI state needed to build the snapshot.
 */
export interface UseExposePublicApiOptions<G extends GroupNode> {
    rows: Row<G>[];
    enableStickyGroupHeader: boolean;
    childController?: ChildVirtualizerController | null;
}
/**
 * Return value of useExposePublicApi.
 */
export interface UseExposePublicApiReturnValue {
    /** Updates the store snapshot from virtualizer instance changes */
    collectVirtualizerStateChanges: (instance: UseVirtualizerReturnType | undefined) => void;
}
/**
 * Serializable subset of {@link DataCascadeUISnapshot} that a consumer can
 * persist and pass back as `initialState` to restore the component.
 */
export interface DataCascadeRestorableState {
    expanded?: Record<string, boolean>;
    rowSelection?: Record<string, boolean>;
    scrollRect?: {
        width: number;
        height: number;
    };
    scrollAnchorItemIndex?: number | null;
    connectedChildren?: Record<string, Pick<ConnectedChildState, 'cellId' | 'scrollAnchorItemIndex'> & {
        isConnected: boolean;
    }>;
}
/**
 * Derives a {@link DataCascadeRestorableState} from a live snapshot,
 * keeping only the fields meaningful for restoration.
 */
export declare const toRestorableState: <G extends GroupNode, L extends LeafNode>(snapshot: DataCascadeUISnapshot<G, L>) => DataCascadeRestorableState;
/**
 * Definition of the public API ref for the data cascade component.
 */
export interface DataCascadeImplRef<G extends GroupNode, L extends LeafNode> {
    /**
     * Returns helpers to access a minimal readonly state of the data cascade component.
     * This can be used as-is or put together leveraging useSyncExternalStore to create a more reactive
     * component state.
     *
     * @example
     * ```ts
     * export function useDataCascadeSnapshot(ref: React.RefObject<DataCascadeImplRef | null>): DataCascadeSnapshot {
     *   return useSyncExternalStore(
     *     (onStoreChange) => ref.current?.getUISnapshotStore()?.subscribe(onStoreChange) ?? (() => {}),
     *     () => ref.current?.getUISnapshotStore()?.getSnapshot() ?? DEFAULT_SNAPSHOT,
     *     () => ref.current?.getUISnapshotStore()?.getServerSnapshot() ?? DEFAULT_SNAPSHOT
     *   );
     * }
     * ```
     */
    getUISnapshotStore: () => DataCascadeUISnapshotStore<G, L> | null;
}
/**
 * Hook that owns the public API ref: aggregates state + virtualizer into a snapshot store,
 * updates the store when inputs change, and exposes getStateStore via useImperativeHandle.
 * Call from the cascade impl with the ref and options; the ref will be populated after mount.
 */
export declare function useExposePublicApi<G extends GroupNode, L extends LeafNode>(ref: React.Ref<DataCascadeImplRef<G, L>>, options: UseExposePublicApiOptions<G>): UseExposePublicApiReturnValue;
