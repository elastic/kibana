import type { MaybePromise } from '@kbn/utility-types';
export interface HasSerializableState<SerializedState extends object = object> {
    /**
     * Serializes all state into a format that can be saved into
     * some external store. The opposite of `deserialize` in the {@link ReactEmbeddableFactory}
     */
    serializeState: () => SerializedState;
    /**
     * Applies a serialized state snapshot owned by the parent container.
     */
    applySerializedState: (state?: SerializedState) => MaybePromise<void>;
}
export declare const apiHasSerializableState: (api: unknown | null) => api is HasSerializableState;
